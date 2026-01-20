// =================================================================
// --- CONFIGURAÇÕES DO PROJETO ---
// =================================================================

// 1. URL do modelo (Configurado no netlify.toml)
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
// --- FUNÇÃO DE INICIALIZAÇÃO ---
// =================================================================

async function iniciar() {
    // Mapeia os elementos do HTML
    uploadInput = document.getElementById('upload-camera');
    modeloIdentificadoEl = document.getElementById('modelo-identificado');
    imagemPreviewEl = document.getElementById('imagem-preview');
    tamanhoContainerEl = document.getElementById('tamanho-container');
    codigoContainerEl = document.getElementById('codigo-container');

    // Inicializa o Firebase
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    const db = firebase.firestore();

    modeloIdentificadoEl.innerText = 'Carregando recursos...';

    try {
        // Carrega modelo, metadados e catálogo em paralelo
        const [modelResponse, metadataResponse, catalogoSnapshot] = await Promise.all([
            tf.loadLayersModel(MODEL_URL),
            fetch(METADATA_URL),
            db.collection('modelos').get()
        ]);

        model = modelResponse;
        metadata = await metadataResponse.json();

        // Carrega catálogo na memória
        catalogoSnapshot.forEach(doc => {
            const modelo = doc.data();
            catalogo[modelo.nomeModelo] = { numeracoes: modelo.numeracoes };
        });

        modeloIdentificadoEl.innerText = 'Tudo pronto! Por favor, tire uma foto.';
        uploadInput.addEventListener('change', handleImageUpload);
    } catch (error) {
        modeloIdentificadoEl.innerText = 'Falha crítica ao carregar recursos.';
        console.error("ERRO DE CARREGAMENTO:", error);
        alert("ERRO: Não foi possível carregar o modelo ou dados. Verifique a conexão.");
    }
}

// =================================================================
// --- FLUXO DE ANÁLISE DA IMAGEM ---
// =================================================================

async function handleImageUpload(event) {
    if (!model || !metadata) return alert("O modelo de IA ainda não está pronto.");
    
    const file = event.target.files[0];
    if (!file) return;

    resetInterface('Analisando...');
    
    const reader = new FileReader();
    reader.onload = e => {
        imagemPreviewEl.src = e.target.result;
        imagemPreviewEl.style.display = 'block';
        imagemPreviewEl.onload = () => processarPredicao(imagemPreviewEl);
    };
    reader.readAsDataURL(file);
}

// --- AQUI ESTÁ A CORREÇÃO MÁGICA (CROP CENTRAL) ---
async function processarPredicao(imagem) {
    try {
        // 1. Converte a imagem para tensor bruto
        let tensor = tf.browser.fromPixels(imagem);

        // 2. CÁLCULO DO CROP CENTRAL (Para não distorcer a imagem)
        const [height, width] = tensor.shape;
        const shorterSide = Math.min(height, width);
        const startingHeight = (height - shorterSide) / 2;
        const startingWidth = (width - shorterSide) / 2;

        // 3. Aplica o corte e redimensiona
        tensor = tensor.slice([startingHeight, startingWidth, 0], [shorterSide, shorterSide, 3])
            .resizeBilinear([224, 224]) // Bilinear é melhor para manter qualidade
            .toFloat()
            .expandDims();

        // 4. Faz a previsão
        const predictions = await model.predict(tensor).data();
        tensor.dispose(); // Limpa a memória

        // 5. Encontra a melhor aposta
        let maxProbability = 0;
        let predictedClassIndex = -1;
        for (let i = 0; i < predictions.length; i++) {
            if (predictions[i] > maxProbability) {
                maxProbability = predictions[i];
                predictedClassIndex = i;
            }
        }

        // Configurações de confiança
        const confidenceThreshold = 0.50; // Mantivemos 50% para teste
        const modeloEncontrado = metadata.labels[predictedClassIndex];
        const probabilidade = (maxProbability * 100).toFixed(0);

        // DIAGNÓSTICO NO CONSOLE
        console.log("================ DIAGNÓSTICO ================");
        console.log("Modelo Visto:", modeloEncontrado);
        console.log("Confiança:", probabilidade + "%");
        console.log("Existe no catálogo?", catalogo[modeloEncontrado] ? "SIM" : "NÃO");
        console.log("=============================================");

        // DECISÃO FINAL
        if (maxProbability > confidenceThreshold) {
            modeloIdentificadoEl.innerText = `Modelo: ${modeloEncontrado} (${probabilidade}% de certeza)`;
            iniciarFluxoDeSelecao(modeloEncontrado);
        } else {
            resetInterface(`
                Quase lá! Identifiquei <strong>${modeloEncontrado}</strong> mas com apenas ${probabilidade}% de certeza.<br>
                Tente aproximar mais a câmera do produto.
            `);
        }
    } catch (error) {
         resetInterface('Erro técnico ao analisar a imagem.');
         console.error("ERRO NA PREDIÇÃO:", error);
    }
}

// =================================================================
// --- FUNÇÕES DE INTERFACE ---
// =================================================================

function iniciarFluxoDeSelecao(nomeDoModelo) {
    const produto = catalogo[nomeDoModelo];
    if (produto && produto.numeracoes) {
        criarSeletorDeTamanho(produto.numeracoes);
    } else {
        codigoContainerEl.innerHTML = '<p class="erro">Modelo identificado, mas não cadastrado no banco de dados.</p>';
    }
}

function criarSeletorDeTamanho(numeracoes) {
    const tamanhosDisponiveis = Object.keys(numeracoes);
    const titulo = document.createElement('h3');
    titulo.innerText = 'Selecione o Tamanho:';
    
    const selectElement = document.createElement('select');
    selectElement.id = 'seletor-tamanho';

    selectElement.onchange = function(event) {
        const tamanhoSelecionado = event.target.value;
        if (tamanhoSelecionado) {
            exibirCodigoFinal(numeracoes[tamanhoSelecionado]);
        } else {
            codigoContainerEl.innerHTML = "";
        }
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
    const titulo = '<h3>Código de Barras:</h3>';
    const barcodeSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    barcodeSvg.id = 'barcode-final';

    codigoContainerEl.innerHTML = titulo;
    codigoContainerEl.appendChild(barcodeSvg);

    try {
        JsBarcode("#barcode-final", codigoDeBarras, {
            format: "EAN13",
            displayValue: true,
            fontSize: 18,
            margin: 10
        });
    } catch (e) {
        console.error("Erro no código de barras:", e);
        codigoContainerEl.innerHTML = '<p class="erro">Erro ao gerar código.</p>';
    }
}

function resetInterface(mensagem) {
    modeloIdentificadoEl.innerHTML = mensagem;
    tamanhoContainerEl.innerHTML = "";
    codigoContainerEl.innerHTML = "";
}

document.addEventListener('DOMContentLoaded', iniciar);