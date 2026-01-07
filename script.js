const firebaseConfig = {
    apiKey: "AIzaSyBE3zKmHdr0dXKbKb67-AascSf4aKhI_NU",
    authDomain: "identificador-de-havaianas.firebaseapp.com",
    projectId: "identificador-de-havaianas",
    storageBucket: "identificador-de-havaianas.firebasestorage.app",
    messagingSenderId: "599447753010",
    appId: "1:599447753010:web:4ae65ee4e1eeb76e13072b"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const modelURLBase = 'https://itinhocg.github.io/identificador-de-havaianas/';
let model;
let catalogo = {};

const uploadInput = document.getElementById('upload-camera');
const modeloIdentificadoEl = document.getElementById('modelo-identificado');
const codigosContainerEl = document.getElementById('codigos-container');

async function carregarCatalogoDoFirebase() {
    modeloIdentificadoEl.innerText = 'Carregando catálogo...';
    try {
        const snapshot = await db.collection('modelos').get();
        if (snapshot.empty) {
            modeloIdentificadoEl.innerText = 'Erro: Catálogo vazio.';
            return;
        }
        snapshot.forEach(doc => {
            const modelo = doc.data();
            catalogo[modelo.nomeModelo] = { numeracoes: modelo.numeracoes };
        });
        modeloIdentificadoEl.innerText = '';
    } catch (error) {
        console.error("ERRO AO BUSCAR CATÁLOGO:", error);
        modeloIdentificadoEl.innerText = 'Falha ao conectar com DB.';
    }
}

async function iniciar() {
    await carregarCatalogoDoFirebase();
    if (Object.keys(catalogo).length > 0) {
        try {
            modeloIdentificadoEl.innerText = 'Carregando modelo de IA...';
            const modelURL = modelURLBase + 'model.json';
            const metadataURL = modelURLBase + 'metadata.json';
            
            // A linha que estava dando erro
            model = await tmImage.load(modelURL, metadataURL);
            
            modeloIdentificadoEl.innerText = 'Pronto. Tire uma foto.';
        } catch (error) {
            console.error("ERRO CRÍTICO AO CARREGAR MODELO DE IA:", error);
            modeloIdentificadoEl.innerText = 'Falha ao carregar o modelo de reconhecimento.';
        }
    }
}

uploadInput.addEventListener('change', async (event) => {
    if (!model) return alert("Modelo de IA não carregado.");
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
                    modeloIdentificadoEl.innerText = `${modeloEncontrado} (${(prediction[0].probability * 100).toFixed(0)}%)`;
                    exibirCodigos(modeloEncontrado);
                } catch (error) {
                    modeloIdentificadoEl.innerText = 'Erro ao analisar imagem.';
                }
            };
            imagem.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
});

function exibirCodigos(nomeDoModelo) {
    const produto = catalogo[nomeDoModelo];
    if (produto) {
        for (const numeracao in produto.numeracoes) {
            const codigoDeBarras = produto.numeracoes[numeracao];
            const itemDiv = document.createElement('div');
            // ... (código de exibição do barcode)
        }
    } else {
        codigosContainerEl.innerText = 'Modelo não encontrado no catálogo.';
    }
}

// CORREÇÃO FINAL E DEFINITIVA:
// Garante que a função 'iniciar' só será chamada DEPOIS que
// toda a página, incluindo a biblioteca teachable-machine, estiver pronta.
document.addEventListener('DOMContentLoaded', iniciar);