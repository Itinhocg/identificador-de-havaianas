// =================================================================
// --- CONFIGURAÇÕES DO PROJETO ---
// =================================================================

// 1. URL do modelo
const MODEL_URL = "/api/model/model.json";
const METADATA_URL = "/api/metadata/metadata.json";

// 2. Configurações do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBE3zKmHdr0dXKbKb67-AascSf4aKhI_NU",
    authDomain: "identificador-de-havaianas.firebaseapp.com",
    projectId: "identificador-de-havaianas",
    storageBucket: "identificador-de-havaianas.firebasestorage.app",
    messagingSenderId: "599447753010",
    appId: "1:599447753010:web:4ae65ee4e1eeb76e13072b"
};

// =================================================================
// --- VARIÁVEIS GLOBAIS ---
// =================================================================

let model, metadata, catalogo = {};
let uploadInput, modeloIdentificadoEl, imagemPreviewEl, tamanhoContainerEl, codigoContainerEl;

// =================================================================
// --- INICIALIZAÇÃO ---
// =================================================================

async function iniciar() {
    uploadInput = document.getElementById('upload-camera');
    modeloIdentificadoEl = document.getElementById('modelo-identificado');
    imagemPreviewEl = document.getElementById('imagem-preview');
    tamanhoContainerEl = document.getElementById('tamanho-container');
    codigoContainerEl = document.getElementById('codigo-container');

    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();

    modeloIdentificadoEl.innerText = 'Carregando recursos...';

    try {
        const [modelResponse, metadataResponse, catalogoSnapshot] = await Promise.all([
            tf.loadLayersModel(MODEL_URL),
            fetch(METADATA_URL),
            db.collection('modelos').get()
        ]);

        model = modelResponse;
        metadata = await metadataResponse.json();

        catalogoSnapshot.forEach(doc => {
            const modelo = doc.data();
            catalogo[modelo.nomeModelo] = { numeracoes: modelo.numeracoes };
        });

        modeloIdentificadoEl.innerText = 'Tudo pronto! Por favor, tire uma foto.';
        uploadInput.addEventListener('change', handleImageUpload);
    } catch (error) {
        modeloIdentificadoEl.innerText = 'Falha ao carregar recursos.';
        console.error(error);
        alert("Erro ao carregar o sistema.");
    }
}

// =================================================================
// --- PROCESSAMENTO DA IMAGEM (A CORREÇÃO ESTÁ AQUI) ---
// =================================================================

async function handleImageUpload(event) {
    if (!model || !metadata) return alert("Aguarde o carregamento da IA.");
    const file = event.target.files[0];
    if (!file) return;

    resetInterface('Processando imagem...');
    
    const reader = new FileReader();
    reader.onload = e => {
        imagemPreviewEl.src = e.target.result;
        imagemPreviewEl.style.display = 'block';
        imagemPreviewEl.onload = () => processarPredicao(imagemPreviewEl);
    };
    reader.readAsDataURL(file);
}

async function processarPredicao(imagem) {
    try {
        // 1. Converte imagem para Tensor
        let tensor = tf.browser.fromPixels(imagem);

        // 2. CORTE CENTRAL (CROP)
        const [height, width] = tensor.shape;
        const shorterSide = Math.min(height, width);
        const startingHeight = (height - shorterSide) / 2;
        const startingWidth = (width - shorterSide) / 2;

        // 3. PROCESSAMENTO COMPLETO: CORTAR -> REDIMENSIONAR -> NORMALIZAR
        tensor = tensor
            .slice([startingHeight, startingWidth, 0], [shorterSide, shorterSide, 3]) // Corta o quadrado
            .resizeBilinear([224, 224]) // Redimensiona
            .toFloat()
            .div(tf.scalar(127.5)) // <--- A MÁGICA: Divide por 127.5
            .sub(tf.scalar(1))     // <--- A MÁGICA: Subtrai 1 (Resultado fica entre -1 e 1)
            .expandDims();

        // 4. Predição
        const predictions = await model.predict(tensor).data();
        tensor.dispose();

        // 5. Encontrar melhor resultado
        let maxProbability = 0;
        let predictedClassIndex = -1;
        for (let i = 0; i < predictions.length; i++) {
            if (predictions[i] > maxProbability) {
                maxProbability = predictions[i];
                predictedClassIndex = i;
            }
        }

        const confidenceThreshold = 0.70; // VOLTAMOS PARA 70% (AGORA VAI FUNCIONAR)
        const modeloEncontrado = metadata.labels[predictedClassIndex];
        const probabilidade = (maxProbability * 100).toFixed(0);

        // DIAGNÓSTICO
        console.log("=== RESULTADO ===");
        console.log("Modelo:", modeloEncontrado);
        console.log("Confiança:", probabilidade + "%");
        console.log("=================");

        if (maxProbability > confidenceThreshold) {
            modeloIdentificadoEl.innerText = `Modelo: ${modeloEncontrado} (${probabilidade}% de certeza)`;
            iniciarFluxoDeSelecao(modeloEncontrado);
        } else {
            resetInterface(`
                Não tenho certeza absoluta (${probabilidade}%).<br>
                Tente aproximar mais a câmera.
            `);
        }
    } catch (error) {
         resetInterface('Erro ao analisar.');
         console.error(error);
    }
}

// =================================================================
// --- INTERFACE ---
// =================================================================

function iniciarFluxoDeSelecao(nomeDoModelo) {
    const produto = catalogo[nomeDoModelo];
    if (produto && produto.numeracoes) {
        criarSeletorDeTamanho(produto.numeracoes);
    } else {
        codigoContainerEl.innerHTML = '<p class="erro">Modelo não encontrado no catálogo.</p>';
    }
}

function criarSeletorDeTamanho(numeracoes) {
    const tamanhosDisponiveis = Object.keys(numeracoes);
    const titulo = document.createElement('h3');
    titulo.innerText = 'Selecione o Tamanho:';
    const selectElement = document.createElement('select');
    
    selectElement.onchange = function(event) {
        if (event.target.value) exibirCodigoFinal(numeracoes[event.target.value]);
        else codigoContainerEl.innerHTML = "";
    };

    const defaultOption = document.createElement('option');
    defaultOption.value = "";
    defaultOption.innerText = 'Escolha uma opção...';
    selectElement.appendChild(defaultOption);

    for (const tamanho of tamanhosDisponiveis) {
        const optionElement = document.createElement('option');
        optionElement.value = tamanho;
        optionElement.innerText = tamanho;
        selectElement.appendChild(optionElement);
    }

    tamanhoContainerEl.innerHTML = '';
    tamanhoContainerEl.appendChild(titulo);
    tamanhoContainerEl.appendChild(selectElement);
}

function exibirCodigoFinal(codigoDeBarras) {
    codigoContainerEl.innerHTML = '<h3>Código de Barras:</h3><svg id="barcode-final"></svg>';
    try {
        JsBarcode("#barcode-final", codigoDeBarras, { format: "EAN13", displayValue: true, fontSize: 18, margin: 10 });
    } catch (e) {
        console.error(e);
    }
}

function resetInterface(mensagem) {
    modeloIdentificadoEl.innerHTML = mensagem;
    tamanhoContainerEl.innerHTML = "";
    codigoContainerEl.innerHTML = "";
}

document.addEventListener('DOMContentLoaded', iniciar);