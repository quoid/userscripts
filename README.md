// Perfis de preenchimento
const perfis = [
    {
        nome: "LOURDES",
        primeiroNome: "LOURDES",
        ultimoNome: "CAMPOS",
        dataNascimento: "02/03/1997",
        numeroPassaporte: "N3313365",
        dataExpiracaoPassaporte: "28/02/2034",
        telefone: "941336317",
        email: "rluxate2@gmail.com",
        codigoPais: "244",
        genero: "Male",
        nacionalidade: "Angola"
    },
    {
        nome: "CAMILO",
        primeiroNome: "CAMILO",
        ultimoNome: "PITRA",
        dataNascimento: "04/10/1975",
        numeroPassaporte: "N2516344",
        dataExpiracaoPassaporte: "18/06/2029",
        telefone: "941336317",
        email: "rluxate2@gmail.com",
        codigoPais: "244",
        genero: "Male",
        nacionalidade: "Angola"
    },
    {
        nome: "MENAYAME",
        primeiroNome: "MENAYAME",
        ultimoNome: "MBALA",
        dataNascimento: "06/06/1979",
        numeroPassaporte: "N3245116",
        dataExpiracaoPassaporte: "29/04/2039",
        telefone: "9941336317",
        email: "rluxate2@gmail.com",
        codigoPais: "244",
        genero: "Male",
        nacionalidade: "Angola"
    },
    {
        nome: "VICTOR",
        primeiroNome: "VICTO",
        ultimoNome: "MBALA",
        dataNascimento: "02/11/2014",
        numeroPassaporte: "N3558908",
        dataExpiracaoPassaporte: "06/01/2035",
        telefone: "941336317",
        email: "rluxate31@gmail.com",
        codigoPais: "244",
        genero: "Male",
        nacionalidade: "Angola"
    },
    {
        nome: "ANTINIO",
        primeiroNome: "ANTONIO",
        ultimoNome: "TORRES",
        dataNascimento: "13/10/1966",
        numeroPassaporte: "N2645168",
        dataExpiracaoPassaporte: "21/03/2037",
        telefone: "941336317",
        email: "rluxate31@gmail.com",
        codigoPais: "244",
        genero: "Female",
        nacionalidade: "Angola"
    },
    {
        nome: "Brazil",
        primeiroNome: "CINTIA",
        ultimoNome: "CONDE",
        dataNascimento: "30/07/1997",
        numeroPassaporte: "N3132696",
        dataExpiracaoPassaporte: "27/09/2033",
        telefone: "941336317",
        email: "rluxate31@gmail.com",
        codigoPais: "244",
        genero: "Female",
        nacionalidade: "Angola"
    }
];

// Função para preencher o formulário com base no perfil selecionado
function preencherFormulario(perfil) {
    const mapCampos = {
        primeiroNome: "input[placeholder='Enter your first name']",
        ultimoNome: "input[placeholder='Please enter last name.']",
        dataNascimento: "input[placeholder='Please select the date']",
        numeroPassaporte: "input[placeholder='Enter passport number']",
        dataExpiracaoPassaporte: "#passportExpirtyDate",
        codigoPais: "input[placeholder='44']",
        telefone: "input[placeholder='012345648382']",
        email: "input[placeholder='Enter Email Address']",
        genero: "select[name='gender']",
        nacionalidade: "select[name='nationality']"
    };

    for (const campo in mapCampos) {
        const input = document.querySelector(mapCampos[campo]);
        if (input && perfil[campo]) {
            if (input.tagName === "SELECT") {
                // Preenchendo campos SELECT (gênero e nacionalidade)
                const option = Array.from(input.options).find(opt => opt.text.trim() === perfil[campo]);
                if (option) {
                    option.selected = true;
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                }
            } else {
                // Preenchendo campos INPUT
                input.value = perfil[campo];
                input.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }
    }

    alert(`Campos preenchidos com sucesso para o perfil: ${perfil.nome}!`);
}

// Adicionar barra lateral de perfis
function addProfileSidebar() {
    const sidebar = document.createElement('div');
    sidebar.id = "profileSidebar";
    sidebar.style.cssText = `
        position: fixed;
        top: 10%;
        right: 0;
        z-index: 9999;
        background: rgba(255, 255, 255, 0.95);
        width: 200px;
        padding: 10px;
        border-radius: 5px 0 0 5px;
        box-shadow: -3px 0 5px rgba(0, 0, 0, 0.2);
        display: none;
    `;
    sidebar.innerHTML = `<h3 style="text-align: center;">Escolher Perfil</h3>`;
    document.body.appendChild(sidebar);

    perfis.forEach((perfil) => {
        const button = document.createElement('button');
        button.textContent = perfil.nome;
        button.style.cssText = `
            display: block;
            margin: 5px auto;
            padding: 8px;
            width: 90%;
            background: #0056b3;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
        `;
        button.addEventListener('click', () => preencherFormulario(perfil));
        sidebar.appendChild(button);
    });
}

// Adicionar botão flutuante para abrir/fechar a barra lateral
function addFloatingButton() {
    const toggleButton = document.createElement('button');
    toggleButton.textContent = "Perfis";
    toggleButton.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        z-index: 10000;
        background: #0056b3;
        color: white;
        border: none;
        border-radius: 5px;
        padding: 10px 15px;
        cursor: pointer;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
    `;
    toggleButton.addEventListener('click', () => {
        const sidebar = document.getElementById("profileSidebar");
        sidebar.style.display = sidebar.style.display === "none" ? "block" : "none";
    });
    document.body.appendChild(toggleButton);
}

// Executar ao carregar a página
window.addEventListener('load', () => {
    addProfileSidebar();
    addFloatingButton();
});.
