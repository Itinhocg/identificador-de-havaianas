const MODEL_URL = "https://teachablemachine.withgoogle.com/models/SXn8X12fF/model.json";
const METADATA_URL = "https://teachablemachine.withgoogle.com/models/SXn8X12fF/metadata.json";
const firebaseConfig = {
    apiKey: "AIzaSyBE3zKmHdr0dXKbKb67-AascSf4aKhI_NU",
    authDomain: "identificador-de-havaianas.firebaseapp.com",
    projectId: "identificador-de-havaianas",
    storageBucket: "identificador-de-havaianas.firebasestorage.app",
    messagingSenderId: "599447753010",
    appId: "1:599447753010:web:4ae65ee4e1eeb76e13072b"
};
let model, metadata, catalogo = {};
let uploadInput, modeloIdentificadoEl, codigosContainerEl, imagemPreviewEl;

async function iniciar() {
    uploadInput = document.getElementById('upload-camera');
    modeloIdentificadoEl = document.getElementById('modelo-identificado');
    codigosContainerEl = document.getElementById('codigos-container');
    imagemPreviewEl = document.getElementById('imagem-preview');
    firebase.initializeApp(firebaseConfig);
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
        modeloIdentificadoEl.innerText = 'Falha crítica: Problema de CORS.';
        console.error("ERRO DE CORS:", error);
        alert("O ERRO É CORS! A sua extensão 'Allow CORS' está desligada. Por favor, ative-a e recarregue a página.");
    }
}
async function handleImageUpload(event) {
    if (!model || !metadata) return alert("O modelo de IA ainda não está pronto.");
    const file = event.target.files[0];
    if (!file) return;
    modeloIdentificadoEl.innerText = 'Analisando...';
    codigosContainerEl.innerHTML = '';
    const reader = new FileReader();
    reader.onload = e => {
        imagemPreviewEl.src = e.target.result;
        imagemPreviewEl.style.display = 'block';
        imagemPreviewEl.onload = async () => {
            try {
                const tensor = tf.browser.fromPixels(imagemPreviewEl).resizeNearestNeighbor([224, 224]).toFloat().expandDims();
                const predictions = await model.predict(tensor).data();
                tensor.dispose();
                let maxProbability = 0, predictedClassIndex = -1;
                for (let i = 0; i < predictions.length; i++) {
                    if (predictions[i] > maxProbability) {
                        maxProbability = predictions[i];
                        predictedClassIndex = i;
                    }
                }
                const modeloEncontrado = metadata.labels[predictedClassIndex];
                const probabilidade = (maxProbability * 100).toFixed(0);
                modeloIdentificadoEl.innerText = `${modeloEncontrado} (${probabilidade}% de certeza)`;
                exibirCodigos(modeloEncontrado);
            } catch (error) {
                 modeloIdentificadoEl.innerText = 'Erro ao analisar a imagem.';
                 console.error("ERRO NA PREDIÇÃO:", error);
            }
        }
    };
    reader.readAsDataURL(file);
}
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
            JsBarcode(`#${barcodeSvg.id}`, codigoDeBarras, {format: "EAN13", displayValue: true, fontSize: 14, margin: 10});
        }
    } else {
        codigosContainerEl.innerText = 'Modelo identificado, mas não encontrado no catálogo.';
    }
}
document.addEventListener('DOMContentLoaded', iniciar);