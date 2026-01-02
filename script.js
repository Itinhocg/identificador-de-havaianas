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
        modeloIdentificadoEl.innerText = '';
    } catch (error) {
        console.error("ERRO CRÍTICO AO BUSCAR CATÁLOGO: ", error);
        modeloIdentificadoEl.innerText = 'Falha ao conectar com o banco de dados.';
    }
}

async function iniciar() {
    console.log("[DIAGNÓSTICO] Função 'iniciar' começou.");
    await carregarCatalogoDoFirebase();
    if (Object.keys(catalogo).length > 0) {
        console.log("[DIAGNÓSTICO] Catálogo carregado. Tentando carregar modelo de IA...");
        try {
            const modelURL = modelURLBase + 'model.json';
            const metadataURL = modelURLBase + 'metadata.json';
            model = await tmImage.load(modelURL, metadataURL);
            console.log("[DIAGNÓSTICO] SUCESSO! Modelo de IA carregado e pronto.");
        } catch (error) {
            console.error("[DIAGNÓSTICO] FALHA CRÍTICA AO CARREGAR MODELO DE IA:", error);
            modeloIdentificadoEl.innerText = 'Falha ao carregar o modelo de reconhecimento.';
        }
    }
}

uploadInput.addEventListener('change', async (event) => {
    console.log("==========================================");
    console.log("[DIAGNÓSTICO] PASSO 1: FOTO SELECIONADA. Processo de análise iniciado.");

    if (!model) {
        console.error("[DIAGNÓSTICO] FALHA: A análise começou, mas a variável 'model' está vazia.");
        return alert("O modelo de IA não foi carregado. Verifique os logs de diagnóstico.");
    }
    console.log("[DIAGNÓSTICO] PASSO 2: Modelo de IA confirmado. Está pronto para uso.");

    modeloIdentificadoEl.innerText = 'Analisando...';
    codigosContainerEl.innerHTML = '';
    
    const file = event.target.files[0];
    if (file) {
        console.log("[DIAGNÓSTICO] PASSO 3: Arquivo da imagem recebido.", file);

        const imagem = document.createElement('img');
        console.log("[DIAGNÓSTICO] PASSO 4: Elemento <img> para análise criado na memória.");

        // Adicionando um "detetive" para o caso de erro no carregamento da imagem
        imagem.onerror = () => {
            console.error("!!!!!!!!!! [DIAGNÓSTICO] ERRO FATAL NO PASSO 6 !!!!!!!!!!");
            console.error("O evento 'onerror' da imagem foi disparado. O navegador não conseguiu ler o arquivo da foto.");
            modeloIdentificadoEl.innerText = 'Erro fatal ao ler o arquivo de imagem.';
        };

        // Adicionando o "detetive" para o caso de sucesso
        imagem.onload = async () => {
            console.log("!!!!!!!!!! [DIAGNÓSTICO] SUCESSO NO PASSO 6 !!!!!!!!!!");
            console.log("[DIAGNÓSTICO] PASSO 7: Imagem carregada na memória. Pronta para ser analisada pela IA.");
            
            try {
                console.log("[DIAGNÓSTICO] PASSO 8: Enviando a imagem para o cérebro da IA (model.predict).");
                const prediction = await model.predict(imagem);
                console.log("[DIAGNÓSTICO] PASSO 9: Cérebro da IA respondeu com sucesso.", prediction);
                
                prediction.sort((a, b) => b.probability - a.probability);
                const modeloEncontrado = prediction[0].className;
                
                console.log("[DIAGNÓSTICO] PASSO 10: Veredito final:", modeloEncontrado);
                modeloIdentificadoEl.innerText = `${modeloEncontrado} (${(prediction[0].probability * 100).toFixed(0)}% de certeza)`;
                exibirCodigos(modeloEncontrado);

            } catch (error) {
                console.error("!!!!!!!!!! [DIAGNÓSTICO] ERRO CRÍTICO NO PASSO 8 !!!!!!!!!!", error);
                modeloIdentificadoEl.innerText = 'Erro ao processar a imagem com a IA.';
            } finally {
                console.log("[DIAGNÓSTICO] PASSO 11: Limpando a imagem da memória.");
                URL.revokeObjectURL(imagem.src);
            }
        };
        
        console.log("[DIAGNÓSTICO] PASSO 5: 'Detetives' (onload e onerror) posicionados. Preparando para carregar a imagem na memória...");
        
        // A linha onde o problema provavelmente está
        const objectURL = URL.createObjectURL(file);
        imagem.src = objectURL;
        
        console.log("[DIAGNÓSTICO] PASSO 6: Imagem enviada para carregamento. Aguardando resposta dos 'detetives'...");

    } else {
        console.warn("[DIAGNÓSTICO] Evento disparado, mas nenhum arquivo foi encontrado.");
    }
});

function exibirCodigos(nomeDoModelo) {
    // ... (esta função está ok, sem necessidade de diagnóstico por enquanto) ...
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

document.addEventListener('DOMContentLoaded', iniciar);