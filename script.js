// [Todo o código anterior permanece o mesmo até o addEventListener]

// ... (código de configuração, iniciar(), etc.)

uploadInput.addEventListener('change', async (event) => {
    if (!model) return alert("Aguarde, o modelo de IA ainda não está pronto.");
    
    modeloIdentificadoEl.innerText = 'Analisando...';
    codigosContainerEl.innerHTML = '';
    const file = event.target.files[0];

    if (file) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const imagem = document.createElement('img');
            
            // >>>>> A MUDANÇA CRUCIAL ESTÁ AQUI <<<<<
            // Adicionamos um pequeno delay para garantir que a imagem
            // seja totalmente decodificada pelo navegador antes de ser usada.
            // Isso resolve o erro de "tensor shape".
            imagem.onload = () => {
                setTimeout(async () => {
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
                }, 100); // Um pequeno atraso de 100ms é geralmente suficiente.
            };

            imagem.onerror = () => {
                modeloIdentificadoEl.innerText = 'Erro: Não foi possível carregar a imagem selecionada.';
            };
            
            imagem.src = e.target.result;
        };

        reader.onerror = () => {
            modeloIdentificadoEl.innerText = 'Erro ao ler o arquivo da imagem.';
        };
        
        reader.readAsDataURL(file);
    }
});

// ... (o resto do código, como exibirCodigos() e o addEventListener 'DOMContentLoaded', permanece o mesmo)

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

document.addEventListener('DOMContentLoaded', iniciar);