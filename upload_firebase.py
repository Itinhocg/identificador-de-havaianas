import csv
import firebase_admin
from firebase_admin import credentials, firestore

# --- CONFIGURAÇÃO ---
cred = credentials.Certificate("serviceAccountKey.json")
if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)
db = firestore.client()
arquivo_csv = 'catalogo.csv'

# --- LÓGICA DE ORGANIZAÇÃO ---
catalogo_organizado = {}
print("Lendo o arquivo CSV...")

with open(arquivo_csv, mode='r', encoding='utf-8') as csv_file:
    csv_reader = csv.DictReader(csv_file, delimiter=';')
    
    for row in csv_reader:
        # A MÁGICA ACONTECE AQUI!
        # 1. Pega o ID "sujo" da planilha.
        id_bruto = row["ID_Modelo"]
        # 2. Cria um ID "limpo", trocando todas as barras '/' por underscores '_'.
        id_modelo = id_bruto.replace('/', '_')
        
        tamanho = row["Tamanho"]
        codigo_barras = row["Codigo_Barras"]
        
        if id_modelo not in catalogo_organizado:
            catalogo_organizado[id_modelo] = {
                "nomeModelo": id_modelo,
                "numeracoes": {}
            }
        
        catalogo_organizado[id_modelo]["numeracoes"][tamanho] = codigo_barras

print(f"Dados organizados! Encontramos {len(catalogo_organizado)} modelos únicos para importar.")

# --- UPLOAD PARA O FIREBASE ---
print("\nIniciando upload para o Firebase...")

for id_modelo, dados_modelo in catalogo_organizado.items():
    print(f"Enviando o modelo: {id_modelo}")
    # Agora o script usa o id_modelo "limpo" e sem barras
    doc_ref = db.collection('modelos').document(id_modelo)
    doc_ref.set(dados_modelo)

print("\n🎉 MISSÃO CUMPRIDA! Importação concluída com sucesso!")
print("Pode verificar seu banco de dados no site do Firebase agora.")