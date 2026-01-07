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
            const svgId = `barcode-${Math.random().toString(36).substr(2, 9)}`;
            barcodeSvg.id = svgId;
            
            itemDiv.appendChild(numeracaoP);
            itemDiv.appendChild(barcodeSvg);
            codigosContainerEl.appendChild(itemDiv);
            
            // ========== INÍCIO DA CORREÇÃO FINAL ==========
            // Damos ao navegador um "respiro" para renderizar o SVG na tela
            // antes de tentarmos desenhar nele.
            setTimeout(() => {
                try {
                    JsBarcode(`#${svgId}`, codigoDeBarras, {
                        format: "EAN13",
                        displayValue: true,
                        fontSize: 14,
                        margin: 10
                    });
                } catch (e) {
                    console.error(`Falha ao gerar o código de barras para ${svgId}`, e);
                }
            }, 0); // O '0' é intencional. Ele apenas adia a execução para o próximo "tick" do navegador.
            // ========== FIM DA CORREÇÃO FINAL ==========
        }
    } else {
        codigosContainerEl.innerText = 'Modelo identificado, mas não encontrado no catálogo.';
    }
}