# 🍕 Pizza Agent - Versão Simplificada

Um exemplo prático de como usar a API HINOW para criar um agente de IA com **function calling** (ferramentas).

## 📖 Para Iniciantes

Este projeto foi simplificado para ser fácil de entender. Mesmo se você está começando a programar, pode aprender como funciona um agente de IA.

### 🎯 O que este projeto faz?

- Um **chatbot de pizzaria** que pode usar ferramentas
- **Gerencia carrinho** de compras com sessões de usuário
- **Interface web simples** para conversar com a IA
- **6 ferramentas** que a IA pode usar: ver menu, adicionar, remover, atualizar, ver carrinho, limpar

## 🏗️ Estrutura do Projeto

```
📁 pizza_sample/
├── 📄 server_simple.js      # Servidor backend simplificado
├── 📄 index_simple.html     # Frontend simplificado 
├── 📄 .env                  # Configurações (API keys, etc)
├── 📄 package.json          # Dependências do Node.js
└── 📄 README_SIMPLES.md     # Este arquivo
```

## 🚀 Como usar

1. **Configure o ambiente:**
   ```bash
   cp .env.example .env
   # Edite o .env com suas configurações
   ```

2. **Instale dependências:**
   ```bash
   npm install
   ```

3. **Execute:**
   ```bash
   node server_simple.js
   ```

4. **Abra:** http://localhost:4455

## 🔧 Como funciona?

### 1. **Backend (server_simple.js)**

**Conceitos principais:**
- **Express**: Servidor web simples
- **Sessions**: Cada usuário tem seu carrinho separado
- **Tools**: Funções que a IA pode executar
- **API HINOW**: Onde a IA "pensa" e decide que ferramentas usar

**Fluxo básico:**
```
Usuario → Frontend → Backend → HINOW API → Backend → Frontend → Usuario
                                  ↓
                              [IA decide usar ferramentas]
                                  ↓
                           [Backend executa ferramentas]
                                  ↓
                           [IA gera resposta final]
```

### 2. **Frontend (index_simple.html)**

**Conceitos principais:**
- **HTML**: Estrutura da página
- **CSS**: Estilos visuais
- **JavaScript**: Lógica de interação
- **Fetch API**: Comunicação com o backend

### 3. **Ferramentas disponíveis:**

| Ferramenta | O que faz |
|------------|-----------|
| `get_pizza_menu` | Mostra pizzas disponíveis |
| `add_to_order` | Adiciona pizza ao carrinho |
| `view_cart` | Mostra carrinho atual |
| `remove_from_cart` | Remove pizzas específicas |
| `update_cart_item` | Muda quantidade (0 = remove) |
| `clear_cart` | Limpa todo o carrinho |

## 🎓 Para Aprender

### Se você é **iniciante em programação:**
1. Leia primeiro o **index_simple.html** (é mais fácil)
2. Entenda como funciona o **CSS** e **HTML**
3. Depois veja o **JavaScript** do frontend
4. Por último, estude o **server_simple.js**

### Se você já sabe **programar básico:**
1. Estude o **server_simple.js** primeiro
2. Entenda como as **ferramentas** são definidas
3. Veja como é feita a **comunicação com HINOW API**
4. Analise o **sistema de sessões**

### Se você quer **entender IA:**
1. Foque na parte de **Tools** (ferramentas)
2. Veja como a IA **decide** que ferramenta usar
3. Entenda o **fluxo de duas chamadas** para API
4. Experimente **modificar as ferramentas**

## 🔄 Diferenças da versão complexa

### ✅ **Simplificado:**
- **Menos logs** (só o essencial)
- **Funções menores** e mais focadas
- **Comentários em português** explicando tudo
- **Lógica linear** (fácil de seguir)
- **Sem abstrações** desnecessárias

### ✅ **Mantido:**
- **Todas as funcionalidades** (nada foi removido)
- **Sessões de usuário** funcionando
- **Todas as 6 ferramentas** disponíveis
- **Sistema de carrinho** completo
- **Interface bonita** e responsiva

## 🧪 Experimentos para Aprender

### **Nível Iniciante:**
1. Mude as **cores** do CSS
2. Adicione uma **nova pizza** no array `PIZZAS`
3. Mude o **texto dos botões**

### **Nível Intermediário:**
1. Adicione uma nova **ferramenta** (ex: calcular desconto)
2. Mude o **modelo de IA** no .env
3. Adicione **validações** nas funções

### **Nível Avançado:**
1. Implemente **banco de dados** real
2. Adicione **autenticação** de usuários
3. Crie **novas funcionalidades** (favoritos, histórico, etc)

## 🆘 Problemas Comuns

### **"Cannot find module"**
```bash
npm install
```

### **"Port already in use"**
Mude `APP_PORT` no .env para outro número (ex: 4456)

### **"API Error"**
Verifique se o HINOW Hub está rodando e se a API key está correta

### **"Resposta vazia"**
Verifique o modelo no .env - alguns modelos podem não suportar function calling

## 📚 Próximos Passos

1. **Entenda completamente** este código
2. **Modifique** e experimente
3. **Crie seu próprio agente** com outras ferramentas
4. **Estude** a documentação oficial do HINOW
5. **Compartilhe** o que aprendeu!

---

💡 **Dica:** Este é um exemplo **real e funcional**. Use como base para seus próprios projetos!