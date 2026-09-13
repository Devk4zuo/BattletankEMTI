/* Battle Tank EMTI - Executor JavaScript multi-funções - Professor Kazuo */

function safeValue(value) {
    if (value === null || ["number","string","boolean"].includes(typeof value)) return value;
    if (typeof value === "undefined") return "undefined";
    try { return JSON.parse(JSON.stringify(value)); } catch (_e) { return String(value); }
}

function formatLogValue(value) {
    if (typeof value === "string") return value;
    try { return JSON.stringify(value); } catch (_e) { return String(value); }
}

function valuesEqual(received, expected) {
    if (typeof received === "number" && typeof expected === "number") {
        if (!Number.isFinite(received) || !Number.isFinite(expected)) return Object.is(received, expected);
        return Math.abs(received - expected) <= 1e-8;
    }
    return Object.is(received, expected);
}

self.onmessage = async (event) => {
    const payload = event.data || {};
    if (payload.type !== "run") return;

    const code = String(payload.code || "");
    const catalog = Array.isArray(payload.catalog) ? payload.catalog : [];
    const logs = [];
    const studentConsole = {
        log: (...args) => logs.push(args.map(formatLogValue).join(" ")),
        info: (...args) => logs.push(args.map(formatLogValue).join(" ")),
        warn: (...args) => logs.push("AVISO: " + args.map(formatLogValue).join(" ")),
        error: (...args) => logs.push("ERRO: " + args.map(formatLogValue).join(" ")),
    };

    try {
        const registryLines = catalog.map((item, index) => {
            const fnName = String(item.functionName || "");
            return `if (typeof ${fnName} === "function") registry[${index}] = ${fnName};`;
        }).join("\n");

        const factory = new Function(
            "console", "fetch", "WebSocket", "XMLHttpRequest", "EventSource",
            `"use strict";\n${code}\nconst registry = {};\n${registryLines}\nreturn registry;`
        );

        const registry = factory(studentConsole, undefined, undefined, undefined, undefined);
        const functions = [];
        let definedCount = 0;

        for (let i = 0; i < catalog.length; i += 1) {
            const spec = catalog[i];
            const studentFunction = registry[i];
            if (typeof studentFunction !== "function") continue;
            definedCount += 1;

            const tests = [];
            let passed = true;
            let functionError = null;

            try {
                for (const test of Array.isArray(spec.tests) ? spec.tests : []) {
                    const args = Array.isArray(test.args) ? test.args : [];
                    let received = studentFunction(...args);
                    if (received && typeof received.then === "function") {
                        throw new Error("Não use async/Promise nas funções do tanque.");
                    }
                    const ok = valuesEqual(received, test.expected);
                    if (!ok) passed = false;
                    tests.push({
                        args: safeValue(args),
                        expected: safeValue(test.expected),
                        received: safeValue(received),
                        passed: ok,
                    });
                }
            } catch (error) {
                passed = false;
                functionError = { name: error?.name || "Error", message: error?.message || String(error) };
            }

            functions.push({ id: spec.id, functionName: spec.functionName, passed, tests, error: functionError });
        }

        self.postMessage({ type:"result", success:true, functions, definedCount, logs });
    } catch (error) {
        self.postMessage({
            type:"result",
            success:false,
            error:{ name:error?.name || "Error", message:error?.message || String(error), stack:error?.stack || "" },
            logs,
        });
    }
};
