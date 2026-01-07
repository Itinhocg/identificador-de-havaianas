// 
// CONFIGURAÇÃO PRINCIPAL
// 

// URL PÚBLICA E ESTÁVEL DO SEU MODELO. Carregamos daqui, e não do GitHub.
const modelURL = "https://teachablemachine.withgoogle.com/models/nSch03VQT/";

// Configuração do Firebase que você forneceu
const firebaseConfig = {
    apiKey: "AIzaSyBE3zKmHdr0dXKbKb67-AascSf4aKhI_NU",
    authDomain: "identificador-de-havaianas.firebaseapp.com",
    projectId: "identificador-de-havaianas",
    storageBucket: "identificador-de-havaianas.firebasestorage.app",
    messagingSenderId: "599447753010",
    appId: "1:599447753010:web:4ae65ee4e1eeb76e13072b"
};

// 
// LÓGICA DO APLICATIVO
// 

// Variáveis globais
let model;
let catalogo = {};

// Elementos da página
const uploadInput = document.getElementById('upload-camera');
const modeloIdentificadoEl = document.getElementById('modelo-identificado');
const codigosContainerEl = document.getElementById('codigos-container');

// Inicializa o Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

async function carregarCatalogoDoFirebase() {
    modeloIdentificadoEl.innerText = 'Carregando catálogo de produtos...';
    try {
        const snapshot = await db.collection('modelos').get();
        if (snapshot.empty) {
            modeloIdentificadoEl.innerText = 'Erro: Catálogo de produtos está vazio no Firebase.';
            return;
        }
        snapshot.forEach(doc => {
            const modelo = doc.data();
            catalogo[modelo.nomeModelo] = { numeracoes: modelo.numeracoes };
        });
    } catch (error) {
        console.error("ERRO AO BUSCAR CATÁLOGO:", error);
        modeloIdentificadoEl.innerText = 'Falha crítica ao conectar com o banco de dados.';
    }
}

async function iniciar() {
    await carregarCatalogoDoFirebase();
    
    if (Object.keys(catalogo).length === 0) {
        console.error("Inicialização interrompida: catálogo não pôde ser carregado.");
        return;
    }

    modeloIdentificadoEl.innerText = 'Carregando modelo de IA...';
    try {
        const modelJsonURL = modelURL + 'model.json';
        const metadataJsonURL = modelURL + 'metadata.json';
        
        model = await tmImage.load(modelJsonURL, metadataJsonURL);
        
        modeloIdentificadoEl.innerText = 'Tudo pronto! Por favor, tire uma foto.';
    } catch (error) {
        console.error("ERRO CRÍTICO AO CARREGAR MODELO DE IA:", error);
        modeloIdentificadoEl.innerText = 'Falha crítica ao carregar o modelo de IA. O link pode estar quebrado.';
        alert("Ocorreu um erro fatal ao carregar o modelo de reconhecimento. Verifique o console (F12).");
    }
}

uploadInput.addEventListener('change', async (event) => {
    if (!model) return alert("Aguarde, o modelo de IA ainda não está pronto.");
    
    modeloIdentificadoEl.innerText = 'Analisando...';
    codigosContainerEl.innerHTML = '';
    const file = event.target.files[0];

    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const imagem = document.createElement('img');
            imagem.onload = async () => {
                try {
                    const prediction = await model.predict(imagem);
                    prediction.sort((a, b) => b.probability - a.probability);
                    const modeloEncontrado = prediction[0].className;
                    const probabilidade = (prediction[0].probability * 100).toFixed(0);

                    modeloIdentificadoEl.innerText = `${modeloEncontrado} (${probabilidade}% de certeza)`;
                    exibirCodigos(modeloEncontrado);
                } catch (error) {
                    console.error("ERRO DURANTE A PREDIÇÃO:", error);
                    modeloIdentificadoEl.innerText = 'Erro ao processar a imagem com a IA.';
                }
            };
            imagem.src = e.target.result;
        };
        reader.onerror = () => {
            modeloIdentificadoEl.innerText = 'Erro ao ler o arquivo da imagem.';
        };
        reader.readAsDataURL(file);
    }
});

function exibirCodigos(nomeDoModelo) {
    codigosContainerEl.innerHTML = ''; 
    const produto = catalogo[nomeDoModelo];
    if (produto) {
        for (const numeracao in produto.numeracoes) {
            const codigoDeBarras = produto.numeracoes[numeracao];
            const itemDiv = document.createElement('div');
            itemDiv.classList.add('codigo-item');
            
            const numeracaoP = document.createElement('p');
            numeracaoP.innerText = `Numeração: ${numeracao}`;
            
            const barcodeSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            barcodeSvg.id = `barcode-${Math.random().toString(36).substr(2, 9)}`;
            
            itemDiv.appendChild(numeracaoP);
            itemDiv.appendChild(barcodeSvg);
            codigosContainerEl.appendChild(itemDiv);
            
            JsBarcode(`#${barcodeSvg.id}`, codigoDeBarras, {
                format: "EAN13",
                displayValue: true,
                fontSize: 14,
                margin: 10
            });
        }
    } else {
        codigosContainerEl.innerText = 'Modelo identificado, mas não encontrado no catálogo.';
    }
}

// 
// O PONTO DE PARTIDA - A SOLUÇÃO FINAL
// Esta linha garante que a função 'iniciar' só será chamada DEPOIS que
// toda a página, incluindo TODAS as bibliotecas, estiver 100% pronta.
// Isso resolve o erro 'tmImage is not defined'.
//
document.addEventListener('DOMContentLoaded', iniciar);