const editor =
    document.getElementById(
        "codeEditor"
    );

const testButton =
    document.getElementById(
        "testButton"
    );

const resetButton =
    document.getElementById(
        "resetButton"
    );

const testResults =
    document.getElementById(
        "testResults"
    );

const consoleArea =
    document.getElementById(
        "console"
    );

const javascriptButton =
    document.getElementById(
        "javascriptButton"
    );

const pythonButton =
    document.getElementById(
        "pythonButton"
    );

const fileName =
    document.getElementById(
        "fileName"
    );

let language =
    "javascript";


// ======================================================
// CONFIGURAÇÃO INICIAL
// ======================================================

const javascriptTemplate =
`function potenciaMotor(potencia) {

    // Escreva seu código aqui

    return potencia;

}`;


const pythonTemplate =
`def potencia_motor(potencia):

    # Escreva seu código aqui

    return potencia
`;


// ======================================================
// DADOS DO TANQUE
// ======================================================

const defaultTankData = {

    speed: 4.5,

    bulletSpeed: 13,

    fireRate: 260,

    upgrades: {
        motor2: false,
        bullet2: false,
        cannon2: false
    }
};


function loadTankData() {

    const saved =
        localStorage.getItem(
            "battleTankPlayer"
        );


    if (!saved) {

        return {
            ...defaultTankData,

            upgrades: {
                ...defaultTankData
                    .upgrades
            }
        };

    }


    return JSON.parse(
        saved
    );
}


let playerTank =
    loadTankData();


// ======================================================
// SALVAR
// ======================================================

function saveTankData() {

    localStorage.setItem(

        "battleTankPlayer",

        JSON.stringify(
            playerTank
        )

    );
}


// ======================================================
// ATUALIZAR VISUAL
// ======================================================

function updateTankPanel() {

    document.getElementById(
        "speedValue"
    ).textContent =
        playerTank.speed.toFixed(1);


    document.getElementById(
        "bulletSpeedValue"
    ).textContent =
        playerTank.bulletSpeed;


    document.getElementById(
        "fireRateValue"
    ).textContent =
        playerTank.fireRate +
        " ms";


    if (
        playerTank.upgrades.motor2
    ) {

        document.getElementById(
            "speedLevel"
        ).textContent =
            "MK-II";

    }
}


// ======================================================
// TROCAR LINGUAGEM
// ======================================================

function selectJavaScript() {

    language =
        "javascript";


    javascriptButton
        .classList
        .add(
            "active"
        );


    pythonButton
        .classList
        .remove(
            "active"
        );


    fileName.textContent =
        "motor.js";


    editor.value =
        javascriptTemplate;
}


function selectPython() {

    language =
        "python";


    pythonButton
        .classList
        .add(
            "active"
        );


    javascriptButton
        .classList
        .remove(
            "active"
        );


    fileName.textContent =
        "motor.py";


    editor.value =
        pythonTemplate;
}


javascriptButton
    .addEventListener(
        "click",
        selectJavaScript
    );


pythonButton
    .addEventListener(
        "click",
        selectPython
    );


// ======================================================
// EXECUTAR JAVASCRIPT
// ======================================================

function runJavaScriptTests(
    code
) {

    const workerCode =
`
${code}

const tests = [
    [2, 4],
    [5, 10],
    [10, 20],
    [17, 34]
];

const results = [];

try {

    for (
        const test
        of tests
    ) {

        const input =
            test[0];

        const expected =
            test[1];

        const received =
            potenciaMotor(
                input
            );

        results.push({

            input,
            expected,
            received,

            passed:
                received ===
                expected

        });

    }

    self.postMessage({
        success: true,
        results
    });

}
catch (error) {

    self.postMessage({

        success: false,

        error:
            error.message

    });

}
`;


    const blob =
        new Blob(
            [workerCode],
            {
                type:
                    "application/javascript"
            }
        );


    const url =
        URL.createObjectURL(
            blob
        );


    const worker =
        new Worker(
            url
        );


    // limite contra loop infinito

    const timeout =
        setTimeout(
            () => {

                worker.terminate();

                URL.revokeObjectURL(
                    url
                );


                displayError(
                    "Tempo limite excedido."
                );

            },
            1500
        );


    worker.onmessage =
        event => {

            clearTimeout(
                timeout
            );


            worker.terminate();


            URL.revokeObjectURL(
                url
            );


            processTestResults(
                event.data
            );
        };


    worker.onerror =
        error => {

            clearTimeout(
                timeout
            );


            worker.terminate();


            URL.revokeObjectURL(
                url
            );


            displayError(
                error.message
            );
        };
}


// ======================================================
// RESULTADOS
// ======================================================

function processTestResults(
    data
) {

    if (
        !data.success
    ) {

        displayError(
            data.error
        );

        return;
    }


    let html = "";

    let allPassed = true;


    data.results.forEach(

        (
            test,
            index
        ) => {

            if (
                test.passed
            ) {

                html +=
`
<div class="test-pass">

✓ Teste ${index + 1}

<br>

Entrada:
${test.input}

→

Resultado:
${test.received}

</div>
`;

            }

            else {

                allPassed =
                    false;


                html +=
`
<div class="test-fail">

✗ Teste ${index + 1}

<br>

Entrada:
${test.input}

<br>

Esperado:
${test.expected}

<br>

Recebido:
${test.received}

</div>
`;

            }

        }
    );


    testResults.innerHTML =
        html;


    if (
        allPassed
    ) {

        unlockMotor();

    }

    else {

        writeConsole(
            "Alguns testes falharam."
        );

    }
}


// ======================================================
// LIBERAR MOTOR
// ======================================================

function unlockMotor() {

    if (
        !playerTank
            .upgrades
            .motor2
    ) {

        playerTank
            .upgrades
            .motor2 =
            true;


        playerTank.speed =
            4.9;


        saveTankData();


        updateTankPanel();


        writeConsole(
            "Motor MK-II desbloqueado."
        );


        document.getElementById(
            "upgradeList"
        ).innerHTML =
`
<div class="upgrade unlocked">

✓ Motor MK-II desbloqueado

</div>

<div class="upgrade locked">

🔒 Munição de alta velocidade

</div>

<div class="upgrade locked">

🔒 Canhão rápido

</div>
`;

    }

    else {

        writeConsole(
            "Motor MK-II já estava desbloqueado."
        );

    }
}


// ======================================================
// ERRO
// ======================================================

function displayError(
    message
) {

    testResults.innerHTML =
`
<div class="test-fail">

ERRO

<br><br>

${message}

</div>
`;


    writeConsole(
        "Erro: " +
        message
    );
}


// ======================================================
// CONSOLE
// ======================================================

function writeConsole(
    message
) {

    consoleArea.innerHTML +=
        "<br>> " +
        message;


    consoleArea.scrollTop =
        consoleArea.scrollHeight;
}


// ======================================================
// EXECUTAR TESTES
// ======================================================

testButton.addEventListener(

    "click",

    () => {

        const code =
            editor.value;


        testResults.innerHTML =
`
<p class="waiting">

Executando testes...

</p>
`;


        if (
            language ===
            "javascript"
        ) {

            runJavaScriptTests(
                code
            );

        }

        else {

            displayError(
                "Python será ativado na próxima etapa."
            );

        }

    }

);


// ======================================================
// RESET
// ======================================================

resetButton.addEventListener(

    "click",

    () => {

        if (
            language ===
            "javascript"
        ) {

            editor.value =
                javascriptTemplate;

        }

        else {

            editor.value =
                pythonTemplate;

        }


        testResults.innerHTML =
`
<p class="waiting">

Aguardando execução...

</p>
`;

    }

);


// ======================================================
// INICIALIZAÇÃO
// ======================================================

selectJavaScript();

updateTankPanel();