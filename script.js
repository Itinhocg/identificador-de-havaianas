    const firebaseConfig = {
      apiKey: "AIzaSyCTLSurHwYlWVS1XZlCi6b0UCdWXYB73hU",
      authDomain: "identificador-havaianas.firebaseapp.com",
      projectId: "identificador-havaianas",
      storageBucket: "identificador-havaianas.appspot.com",
      messagingSenderId: "18134290302",
      appId: "1:18134290302:web:58a9b6e0e9020ab33fed2f"
    };

    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();

    const URL = './';
    let model;
    let catalogo = {};

    const uploadInput = document.getElementById('upload-camera');
    const modeloIdentificadoEl = document.getElementById('modelo-identificado');
    const codigosContainerEl = document.getElementById('codigos-container');

    async function carregarCatalogoDoFirebase() {
        modeloIdentificadoEl.innerText = 'Carregando catálogo de produtos...';
        console.log("Iniciando busca no Firebase...");
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
            console.log("CATÁLOGO CARREGADO DO FIREBASE:", catalogo);
            console.log("CHAVES DO CATÁLOGO ENCONTRADAS:", Object.keys(catalogo));
            modeloIdentificadoEl.innerText = '';
        } catch (error) {
            console.error("ERRO CRÍTICO AO BUSCAR CATÁLOGO: ", error);
            modeloIdentificadoEl.innerText = 'Falha ao conectar com o banco de dados.';
        }
    }

    async function iniciar() {
        await carregarCatalogoDoFirebase();
        if (Object.keys(catalogo).length > 0) {
            try {
                const modelURL = URL + 'model.json';
                const metadataURL = URL + 'metadata.json';
                model = await tmImage.load(modelURL, metadataURL);
                console.log("Modelo de IA carregado com sucesso!");
            } catch (error) {
                console.error("ERRO CRÍTICO AO CARREGAR MODELO DE IA:", error);
                modeloIdentificadoEl.innerText = 'Falha ao carregar o modelo de reconhecimento.';
            }
        }
    }

    uploadInput.addEventListener('change', async (event) => {
        if (!model) return alert("O modelo de IA ainda não foi carregado. Aguarde.");
        modeloIdentificadoEl.innerText = 'Analisando...';
        codigosContainerEl.innerHTML = '';
        const file = event.target.files[0];
        if (file) {
            const imagem = document.createElement('img');
            imagem.src = URL.createObjectURL(file);
            imagem.onload = async () => {
                const prediction = await model.predict(imagem);
                prediction.sort((a, b) => b.probability - a.probability);
                const modeloEncontrado = prediction[0].className;
                console.log("VEREDITO DO MODELO DE IA:", modeloEncontrado);
                modeloIdentificadoEl.innerText = `${modeloEncontrado} (${(prediction[0].probability * 100).toFixed(0)}% de certeza)`;
                exibirCodigos(modeloEncontrado);
                URL.revokeObjectURL(imagem.src);
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

    iniciar();  