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

// A MUDANÇA MAIS IMPORTANTE: Renomeamos a variável para não conflitar com o objeto URL do navegador.
const modelURLBase = 'https://itinhocg.github.io/identificador-de-havaianas/';
let model;
let catalogo = {};

const uploadInput = document.getElementById('upload-camera');
const modeloIdentificadoEl = document.getElementById('modelo-identificado');
const codigosContainerEl = document.getElementById('codigos-container');

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
        modeloIdentificadoEl.innerText = ''; // Limpa a mensagem de carregamento
    } catch (error) {
        console.error("ERRO CRÍTICO AO BUSCAR CATÁLOGO: ", error);
        modeloIdentificadoEl.innerText = 'Falha ao conectar com o banco de dados.';
    }
}

async function iniciar() {
    await carregarCatalogoDoFirebase();
    // Só tenta carregar o modelo se o catálogo foi carregado com sucesso
    if (Object.keys(catalogo).length > 0) {
        try {
            const modelURL = modelURLBase + 'model.json';
            const metadataURL = modelURLBase + 'metadata.json';
            model = await tmImage.load(modelURL, metadataURL);
            console.log("Modelo de IA carregado com sucesso!");
        } catch (error) {
            console.error("ERRO CRÍTICO AO CARREGAR MODELO DE IA:", error);
            modeloIdentificadoEl.innerText = 'Falha ao carregar o modelo de reconhecimento.';
        }
    }
}

uploadInput.addEventListener('change', async (event) => {
    if (!model) {
        return alert("O modelo de IA ainda não foi carregado. Verifique o console para erros (F12).");
    }
    modeloIdentificadoEl.innerText = 'Analisando...';
    codigosContainerEl.innerHTML = '';
    const file = event.target.files[0];
    if (file) {
        const imagem = document.createElement('img');
        
        // CORREÇÃO FINAL: Agora usamos o 'URL' original e correto do navegador.
        imagem.src = URL.createObjectURL(file);
        
        imagem.onload = async () => {
            try {
                const prediction = await model.predict(imagem);
                prediction.sort((a, b) => b.probability - a.probability);
                const modeloEncontrado = prediction[0].className;
                modeloIdentificadoEl.innerText = `${modeloEncontrado} (${(prediction[0].probability * 100).toFixed(0)}% de certeza)`;
                exibirCodigos(modeloEncontrado);
            } catch (error) {
                console.error("ERRO CRÍTICO NA PREDIÇÃO:", error);
                modeloIdentificadoEl.innerText = 'Erro ao analisar a imagem.';
            } finally {
                // Limpa o objeto da memória para evitar vazamentos
                URL.revokeObjectURL(imagem.src);
            }
        }
        imagem.onerror = () => {
            modeloIdentificadoEl.innerText = 'Erro ao carregar a imagem selecionada.';
        }
    }
});

function exibirCodigos(nomeDoModelo) {
    const produto = catalogo[nomeDoModelo];
    if (produto) {
        for (const numeracao in produto.numeracoes) {
            const codigoDeBarras = produto.numeracoes[numeracao];
            const itemDiv = document.createElement('div');
            itemDiv.classList.add('codigo-item');
            const numeracaoP = document.createElement('p');
            numeracaoP.innerText = `Numeração: ${numeracao}`;
            const barcodeSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            barcodeSvg.id = `barcode-${codigoDeBarras}`;
            itemDiv.appendChild(numeracaoP);
            itemDiv.appendChild(barcodeSvg);
            codigosContainerEl.appendChild(itemDiv);
            JsBarcode(`#${barcodeSvg.id}`, codigoDeBarras, { format: "EAN13", displayValue: true, fontSize: 14 });
        }
    } else {
        codigosContainerEl.innerText = 'Modelo não encontrado no nosso catálogo.';
    }
}

// O "porteiro" que garante que tudo está pronto antes de começar.
document.addEventListener('DOMContentLoaded', iniciar);