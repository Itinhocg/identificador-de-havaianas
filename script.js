// =================================================================
// --- CONFIGURAÇÕES DO PROJETO ---
// =================================================================

// 🔴 MODO PRODUÇÃO (NETLIFY) - Descomente esta linha antes de fazer Deploy
// const MODEL_URL = "/api/model/model.json";
// const METADATA_URL = "/api/metadata/metadata.json";

// 🟢 MODO LOCAL (VS CODE / GO LIVE) - Use esta para testar no PC
const MODEL_URL = "https://teachablemachine.withgoogle.com/models/r50xjWIGo/model.json";
const METADATA_URL = "https://teachablemachine.withgoogle.com/models/r50xjWIGo/metadata.json";

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
            catalogo[modelo.nomeModelo] = { 
                numeracoes: modelo.numeracoes,
                imagemUrl: modelo.imagemUrl
            };
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
// --- PROCESSAMENTO DA IMAGEM ---
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
        let tensor = tf.browser.fromPixels(imagem);

        const [height, width] = tensor.shape;
        const shorterSide = Math.min(height, width);
        const startingHeight = (height - shorterSide) / 2;
        const startingWidth = (width - shorterSide) / 2;

        tensor = tensor
            .slice([startingHeight, startingWidth, 0], [shorterSide, shorterSide, 3])
            .resizeBilinear([224, 224])
            .toFloat()
            .div(tf.scalar(127.5))
            .sub(tf.scalar(1))
            .expandDims();

        const predictions = await model.predict(tensor).data();
        tensor.dispose();

        let maxProbability = 0;
        let predictedClassIndex = -1;
        for (let i = 0; i < predictions.length; i++) {
            if (predictions[i] > maxProbability) {
                maxProbability = predictions[i];
                predictedClassIndex = i;
            }
        }

        const confidenceThreshold = 0.70;
        const modeloEncontrado = metadata.labels[predictedClassIndex];
        const probabilidade = (maxProbability * 100).toFixed(0);

        console.log("=== RESULTADO ===");
        console.log("Modelo Original:", modeloEncontrado);
        console.log("Confiança:", probabilidade + "%");
        console.log("=================");

        if (maxProbability > confidenceThreshold) {
            // Remove o prefixo visualmente
            const nomeVisual = modeloEncontrado.replace('SAND.HAV.', '');
            
            // --- AQUI ESTÁ A MUDANÇA ---
            // Usamos innerHTML para colocar o <br> (quebra de linha)
            // Deixei o nome em Negrito (<strong>) e a porcentagem menor (<small>)
            modeloIdentificadoEl.innerHTML = `
                Modelo: <strong>${nomeVisual}</strong><br>
                <small style="color: #555;">(${probabilidade}% de certeza)</small>
            `;
            
            // Continua o fluxo com o nome ORIGINAL
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
// --- INTERFACE (BOTÕES SIM/NÃO + ORDENAÇÃO) ---
// =================================================================

function iniciarFluxoDeSelecao(nomeDoModelo) {
    const produto = catalogo[nomeDoModelo];
    
    tamanhoContainerEl.innerHTML = "";
    codigoContainerEl.innerHTML = "";

    if (produto) {
        if (produto.imagemUrl) {
            const imgContainer = document.createElement('div');
            imgContainer.style.textAlign = "center";
            imgContainer.style.marginBottom = "1rem";

            const imgReferencia = document.createElement('img');
            imgReferencia.src = produto.imagemUrl;
            imgReferencia.className = 'foto-referencia fade-in';
            imgReferencia.alt = `Foto referência`;
            
            const txtPergunta = document.createElement('p');
            txtPergunta.innerText = "O modelo é igual a este?";
            txtPergunta.style.fontWeight = "bold";
            txtPergunta.style.margin = "10px 0";
            txtPergunta.style.color = "#333";

            const divBotoes = document.createElement('div');
            divBotoes.className = 'container-botoes';

            const btnSim = document.createElement('button');
            btnSim.innerText = "SIM ✅";
            btnSim.className = 'btn-sim';
            
            const btnNao = document.createElement('button');
            btnNao.innerText = "NÃO ❌";
            btnNao.className = 'btn-nao';

            btnNao.onclick = function() {
                resetInterface(`
                    Sem problemas! Vamos tentar de novo.<br>
                    <strong>Dica:</strong> Aproxime a câmera e evite sombras.
                `);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            };

            btnSim.onclick = function() {
                txtPergunta.remove();
                divBotoes.remove();
                
                const sucesso = document.createElement('p');
                sucesso.innerHTML = "Confirmado! ✅ Agora escolha o tamanho:";
                sucesso.style.color = "green";
                imgContainer.appendChild(sucesso);

                criarSeletorDeTamanho(produto.numeracoes);
            };

            divBotoes.appendChild(btnNao);
            divBotoes.appendChild(btnSim);

            imgContainer.appendChild(imgReferencia);
            imgContainer.appendChild(txtPergunta);
            imgContainer.appendChild(divBotoes);
            
            tamanhoContainerEl.appendChild(imgContainer);

        } else {
            criarSeletorDeTamanho(produto.numeracoes);
        }

    } else {
        codigoContainerEl.innerHTML = '<p class="erro">Modelo não encontrado no catálogo.</p>';
    }
}

function criarSeletorDeTamanho(numeracoes) {
    let tamanhosDisponiveis = Object.keys(numeracoes);

    tamanhosDisponiveis.sort((a, b) => {
        const extrairNumero = (texto) => {
            const numero = texto.split('/')[0]; 
            return parseInt(numero, 10) || 0;
        };
        const numA = extrairNumero(a);
        const numB = extrairNumero(b);
        return numA - numB;
    });

    if (!document.querySelector('#titulo-tamanho')) {
        const titulo = document.createElement('h3');
        titulo.id = 'titulo-tamanho';
        titulo.innerText = 'Selecione o Tamanho:';
        tamanhoContainerEl.appendChild(titulo);
    }
    
    const selectElement = document.createElement('select');
    selectElement.id = 'seletor-tamanho';
    selectElement.style.marginTop = "10px";

    selectElement.onchange = function(event) {
        if (event.target.value) exibirCodigoFinal(numeracoes[event.target.value]);
        else codigoContainerEl.innerHTML = "";
    };

    const defaultOption = document.createElement('option');
    defaultOption.value = "";
    defaultOption.innerText = 'Toque para escolher...';
    selectElement.appendChild(defaultOption);

    for (const tamanho of tamanhosDisponiveis) {
        const optionElement = document.createElement('option');
        optionElement.value = tamanho;
        optionElement.innerText = tamanho;
        selectElement.appendChild(optionElement);
    }

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