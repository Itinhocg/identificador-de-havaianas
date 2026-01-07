// O URL exato e público do seu modelo.
const modelURL = "https://teachablemachine.withgoogle.com/models/SXn8X12fF/";
let model;

const uploadInput = document.getElementById('upload-camera');
const modeloIdentificadoEl = document.getElementById('modelo-identificado');
const codigosContainerEl = document.getElementById('codigos-container');

async function iniciar() {
    modeloIdentificadoEl.innerText = 'Carregando seu modelo de IA...';
    try {
        const modelJsonURL = modelURL + 'model.json';
        const metadataJsonURL = modelURL + 'metadata.json';
        
        // Carrega o modelo diretamente do link compartilhado.
        model = await tmImage.load(modelJsonURL, metadataJsonURL);
        
        modeloIdentificadoEl.innerText = 'Modelo pronto. Por favor, tire uma foto.';
    } catch (error) {
        console.error("ERRO CRÍTICO AO CARREGAR MODELO DE IA:", error);
        modeloIdentificadoEl.innerText = 'Falha crítica ao carregar o modelo. Verifique o console (F12).';
        alert("Não foi possível carregar o modelo de IA. Verifique sua conexão com a internet.");
    }
}

uploadInput.addEventListener('change', async (event) => {
    if (!model) {
        return alert("O modelo de IA ainda não foi carregado. Por favor, aguarde.");
    }
    modeloIdentificadoEl.innerText = 'Analisando...';
    codigosContainerEl.innerHTML = '';
    const file = event.target.files[0];

    if (file) {
        // Usando o método FileReader, que é mais robusto.
        const reader = new FileReader();

        reader.onload = function(e) {
            const imagem = document.createElement('img');
            
            imagem.onload = async () => {
                try {
                    const prediction = await model.predict(imagem);
                    prediction.sort((a, b) => b.probability - a.probability);
                    const modeloEncontrado = prediction[0].className;
                    const probabilidade = (prediction[0].probability * 100).toFixed(0);

                    modeloIdentificadoEl.innerText = `Modelo: ${modeloEncontrado} (${probabilidade}% de certeza)`;
                    codigosContainerEl.innerHTML = "<p>Predição bem-sucedida! A integração com o Firebase pode ser feita a seguir.</p>";

                } catch (error) {
                    console.error("ERRO NA PREDIÇÃO:", error);
                    modeloIdentificadoEl.innerText = 'Erro ao analisar a imagem.';
                }
            };
            
            imagem.src = e.target.result;
        };
        
        reader.onerror = function() {
            console.error("FileReader falhou ao ler o arquivo.");
            modeloIdentificadoEl.innerText = 'Erro ao carregar o arquivo de imagem.';
        }

        reader.readAsDataURL(file);
    }
});

// Garante que o script só rode quando a página estiver 100% pronta.
document.addEventListener('DOMContentLoaded', iniciar);