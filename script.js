// =================================================================
// --- CONFIGURAÇÕES DO PROJETO ---
// =================================================================

// 1. Cole aqui a URL do seu modelo treinado do Teachable Machine / Netlify
// Lembre-se que, no seu setup, pode ser algo como "/api/model/model.json"
const MODEL_URL = "/api/model/model.json";
const METADATA_URL = "/api/metadata/metadata.json";

// 2. Suas configurações do Firebase
// (Já estão corretas, baseadas no que você enviou)
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
    // Mapeia os elementos do HTML para variáveis JavaScript
    uploadInput = document.getElementById('upload-camera');
    modeloIdentificadoEl = document.getElementById('modelo-identificado');
    imagemPreviewEl = document.getElementById('imagem-preview');
    tamanhoContainerEl = document.getElementById('tamanho-container');
    codigoContainerEl = document.getElementById('codigo-container');

    // Inicializa o Firebase
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();

    modeloIdentificadoEl.innerText = 'Carregando recursos...';

    try {
        // Carrega o modelo de IA, os metadados e o catálogo do Firebase em paralelo
        const [modelResponse, metadataResponse, catalogoSnapshot] = await Promise.all([
            tf.loadLayersModel(MODEL_URL),
            fetch(METADATA_URL),
            db.collection('modelos').get()
        ]);

        model = modelResponse;
        metadata = await metadataResponse.json();

        // Carrega todo o catálogo na memória para acesso rápido
        catalogoSnapshot.forEach(doc => {
            const modelo = doc.data();
            catalogo[modelo.nomeModelo] = { numeracoes: modelo.numeracoes };
        });

        modeloIdentificadoEl.innerText = 'Tudo pronto! Por favor, tire uma foto.';
        uploadInput.addEventListener('change', handleImageUpload);
    } catch (error) {
        // Tratamento do erro de CORS específico do seu setup
        modeloIdentificadoEl.innerText = 'Falha crítica ao carregar recursos.';
        console.error("ERRO DE CORS ou de Rede:", error);
        alert("ERRO: Não foi possível carregar o modelo de IA ou os dados. Se você for o desenvolvedor, verifique se a extensão 'Allow CORS' está ativa ou se o proxy do Netlify está configurado corretamente.");
    }
}

// =================================================================
// --- FLUXO DE ANÁLISE DA IMAGEM ---
// =================================================================

// Função chamada quando o usuário seleciona uma imagem/tira uma foto
async function handleImageUpload(event) {
    if (!model || !metadata) return alert("O modelo de IA ainda não está pronto.");
    
    const file = event.target.files[0];
    if (!file) return;

    // Reseta a interface para uma nova análise
    resetInterface('Analisando...');
    
    // Mostra a imagem na tela
    const reader = new FileReader();
    reader.onload = e => {
        imagemPreviewEl.src = e.target.result;
        imagemPreviewEl.style.display = 'block';
        imagemPreviewEl.onload = () => processarPredicao(imagemPreviewEl); // Processa após a imagem carregar
    };
    reader.readAsDataURL(file);
}

// Função principal de predição e decisão
async function processarPredicao(imagem) {
    try {
        const tensor = tf.browser.fromPixels(imagem).resizeNearestNeighbor([224, 224]).toFloat().expandDims();
        const predictions = await model.predict(tensor).data();
        tensor.dispose();

        // Encontra a melhor previsão
        let maxProbability = 0;
        let predictedClassIndex = -1;
        for (let i = 0; i < predictions.length; i++) {
            if (predictions[i] > maxProbability) {
                maxProbability = predictions[i];
                predictedClassIndex = i;
            }
        }

        const confidenceThreshold = 0.70; // Nosso limite de confiança de 70%

        // **A LÓGICA DE DECISÃO**
        if (maxProbability > confidenceThreshold) {
            // CONFIANÇA ALTA: Continua o fluxo
            const modeloEncontrado = metadata.labels[predictedClassIndex];
            const probabilidade = (maxProbability * 100).toFixed(0);
            modeloIdentificadoEl.innerText = `Modelo: ${modeloEncontrado} (${probabilidade}% de certeza)`;
            
            // Inicia o fluxo interativo de seleção de tamanho
            iniciarFluxoDeSelecao(modeloEncontrado);

        } else {
            // CONFIANÇA BAIXA: Pede para o usuário tentar novamente
            resetInterface(`
                Não foi possível identificar com certeza.<br>
                Por favor, tire uma nova foto com melhor iluminação e enquadramento.
            `);
        }
    } catch (error) {
         resetInterface('Erro ao analisar a imagem.');
         console.error("ERRO NA PREDIÇÃO:", error);
    }
}

// =================================================================
// --- FUNÇÕES DE INTERFACE INTERATIVA ---
// =================================================================

// 1. Inicia o fluxo após a identificação
function iniciarFluxoDeSelecao(nomeDoModelo) {
    const produto = catalogo[nomeDoModelo];
    if (produto && produto.numeracoes) {
        // Encontrou o produto no catálogo, então cria a caixa de seleção
        criarSeletorDeTamanho(produto.numeracoes);
    } else {
        // Não encontrou no catálogo local (que foi carregado do Firebase)
        codigoContainerEl.innerHTML = '<p class="erro">Modelo identificado pela IA, mas não encontrado no catálogo do banco de dados.</p>';
    }
}

// 2. Cria a caixa de seleção de tamanhos dinamicamente
function criarSeletorDeTamanho(numeracoes) {
    const tamanhosDisponiveis = Object.keys(numeracoes);
    
    // Cria um título e o elemento <select>
    const titulo = document.createElement('h3');
    titulo.innerText = 'Selecione o Tamanho:';
    
    const selectElement = document.createElement('select');
    selectElement.id = 'seletor-tamanho'; // ID para estilização CSS

    // Adiciona o "ouvinte" que dispara a ação quando o usuário escolhe um tamanho
    selectElement.onchange = function(event) {
        const tamanhoSelecionado = event.target.value;
        if (tamanhoSelecionado) {
            const codigoDeBarras = numeracoes[tamanhoSelecionado];
            exibirCodigoFinal(codigoDeBarras);
        } else {
            codigoContainerEl.innerHTML = ""; // Limpa se o usuário voltar para a opção padrão
        }
    };

    // Adiciona a primeira opção padrão ("Selecione o tamanho")
    const defaultOption = document.createElement('option');
    defaultOption.value = "";
    defaultOption.innerText = 'Escolha uma opção...';
    selectElement.appendChild(defaultOption);

    // Adiciona todos os tamanhos disponíveis como opções
    for (const tamanho of tamanhosDisponiveis) {
        const optionElement = document.createElement('option');
        optionElement.value = tamanho;
        optionElement.innerText = tamanho;
        selectElement.appendChild(optionElement);
    }

    // Limpa o container de tamanho e adiciona os novos elementos
    tamanhoContainerEl.innerHTML = '';
    tamanhoContainerEl.appendChild(titulo);
    tamanhoContainerEl.appendChild(selectElement);
}

// 3. Exibe o código de barras final na tela
function exibirCodigoFinal(codigoDeBarras) {
    const titulo = '<h3>Código de Barras:</h3>';
    
    // Cria um elemento SVG para o JsBarcode desenhar
    const barcodeSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    barcodeSvg.id = 'barcode-final'; // ID fixo para o SVG

    codigoContainerEl.innerHTML = titulo;
    codigoContainerEl.appendChild(barcodeSvg);

    // Desenha o código de barras no SVG que acabamos de criar
    try {
        JsBarcode("#barcode-final", codigoDeBarras, {
            format: "EAN13",
            displayValue: true,
            fontSize: 18,
            margin: 10
        });
    } catch (e) {
        console.error("Erro ao gerar o código de barras:", e);
        codigoContainerEl.innerHTML = '<p class="erro">Não foi possível gerar o código de barras para este item.</p>';
    }
}

// Função utilitária para limpar a interface
function resetInterface(mensagem) {
    modeloIdentificadoEl.innerHTML = mensagem;
    tamanhoContainerEl.innerHTML = "";
    codigoContainerEl.innerHTML = "";
}

// =================================================================
// --- INICIA A APLICAÇÃO ---
// =================================================================

// Dispara a função 'iniciar' assim que a página estiver totalmente carregada
document.addEventListener('DOMContentLoaded', iniciar);