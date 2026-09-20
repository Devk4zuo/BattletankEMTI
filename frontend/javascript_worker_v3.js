/*
 * Battle Tank EMTI - Executor JavaScript do Laboratório
 * Professor Kazuo
 *
 * O código do aluno é executado dentro de um Web Worker descartável.
 * Isso isola a interface principal e permite encerrar loops infinitos.
 */

function safeValue(value) {
    if (
        value === null ||
        typeof value === "number" ||
        typeof value === "string" ||
        typeof value === "boolean"
    ) {
        return value;
    }

    if (typeof value === "undefined") {
        return "undefined";
    }

    try {
        return JSON.parse(JSON.stringify(value));
    }
    catch (_error) {
        return String(value);
    }
}

function formatLogValue(value) {
    if (typeof value === "string") {
        return value;
    }

    try {
        return JSON.stringify(value);
    }
    catch (_error) {
        return String(value);
    }
}

function valuesEqual(received, expected) {
    if (
        typeof received === "number" &&
        typeof expected === "number"
    ) {
        if (!Number.isFinite(received) || !Number.isFinite(expected)) {
            return Object.is(received, expected);
        }

        return Math.abs(received - expected) <= 1e-9;
    }

    return Object.is(received, expected);
}

self.onmessage = async (event) => {
    const payload = event.data || {};

    if (payload.type !== "run") {
        return;
    }

    const code = String(payload.code || "");
    const challenge = payload.challenge || {};
    const functionName = String(challenge.functionName || "").trim();
    const tests = Array.isArray(challenge.tests) ? challenge.tests : [];
    const logs = [];

    const studentConsole = {
        log: (...args) => logs.push(args.map(formatLogValue).join(" ")),
        info: (...args) => logs.push(args.map(formatLogValue).join(" ")),
        warn: (...args) => logs.push("AVISO: " + args.map(formatLogValue).join(" ")),
        error: (...args) => logs.push("ERRO: " + args.map(formatLogValue).join(" ")),
    };

    try {
        if (!functionName) {
            throw new Error("O desafio não informou o nome da função esperada.");
        }

        /*
         * O aluno programa normalmente. O factory retorna somente a função
         * exigida pelo desafio. A execução continua confinada ao Worker.
         */
        const factory = new Function(
            "console",
            "fetch",
            "WebSocket",
            "XMLHttpRequest",
            "EventSource",
            `"use strict";\n${code}\n\n` +
            `if (typeof ${functionName} !== "function") {\n` +
            `  throw new ReferenceError("Função ${functionName} não encontrada.");\n` +
            `}\n` +
            `return ${functionName};`
        );

        const studentFunction = factory(
            studentConsole,
            undefined,
            undefined,
            undefined,
            undefined,
        );

        const results = [];

        for (let index = 0; index < tests.length; index += 1) {
            const test = tests[index];
            const args = Array.isArray(test.args) ? test.args : [];
            const expected = test.expected;

            let received = studentFunction(...args);

            if (
                received &&
                typeof received.then === "function"
            ) {
                throw new Error(
                    "Este desafio espera uma função comum. Não use async/Promise nesta etapa."
                );
            }

            results.push({
                index,
                visible: Boolean(test.visible),
                args: safeValue(args),
                expected: safeValue(expected),
                received: safeValue(received),
                passed: valuesEqual(received, expected),
            });
        }

        self.postMessage({
            type: "result",
            success: true,
            results,
            logs,
        });
    }
    catch (error) {
        self.postMessage({
            type: "result",
            success: false,
            error: {
                name: error?.name || "Error",
                message: error?.message || String(error),
                stack: error?.stack || "",
            },
            logs,
        });
    }
};
