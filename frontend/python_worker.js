/*
 * Battle Tank EMTI - Executor Python do Laboratório
 * Professor Kazuo
 *
 * Pyodide executa Python real dentro do navegador. O Worker pode ser
 * encerrado pelo laboratório se o código entrar em loop infinito.
 */

const PYODIDE_VERSION = "314.0.6";
const PYODIDE_BASE_URL =
    `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

let pyodide = null;
let pyodidePromise = null;

async function ensurePyodide() {
    if (pyodide) {
        return pyodide;
    }

    if (!pyodidePromise) {
        pyodidePromise = (async () => {
            self.postMessage({
                type: "status",
                status: "loading",
                message: "Carregando Python...",
            });

            importScripts(`${PYODIDE_BASE_URL}pyodide.js`);

            const instance = await loadPyodide({
                indexURL: PYODIDE_BASE_URL,
            });

            pyodide = instance;

            self.postMessage({
                type: "status",
                status: "ready",
                message: `Python ${PYODIDE_VERSION} pronto`,
            });

            return instance;
        })().catch((error) => {
            pyodidePromise = null;

            self.postMessage({
                type: "status",
                status: "error",
                message:
                    "Não foi possível carregar o Python. Verifique a conexão com a internet.",
                detail: error?.message || String(error),
            });

            throw error;
        });
    }

    return pyodidePromise;
}

async function runStudentCode(payload) {
    const runtime = await ensurePyodide();

    runtime.globals.set(
        "BT_USER_CODE",
        String(payload.code || "")
    );

    runtime.globals.set(
        "BT_FUNCTION_NAME",
        String(payload.challenge?.functionName || "")
    );

    runtime.globals.set(
        "BT_TESTS_JSON",
        JSON.stringify(payload.challenge?.tests || [])
    );

    const harness = String.raw`
import contextlib
import io
import json
import math
import traceback


def _safe_value(value):
    if value is None or isinstance(value, (str, int, float, bool)):
        return value

    if isinstance(value, (list, tuple)):
        return [_safe_value(item) for item in value]

    if isinstance(value, dict):
        return {str(key): _safe_value(item) for key, item in value.items()}

    return repr(value)


def _values_equal(received, expected):
    if isinstance(received, bool) or isinstance(expected, bool):
        return received == expected

    if isinstance(received, (int, float)) and isinstance(expected, (int, float)):
        try:
            return math.isclose(float(received), float(expected), rel_tol=0.0, abs_tol=1e-9)
        except Exception:
            return received == expected

    return received == expected


_tests = json.loads(BT_TESTS_JSON)
_namespace = {"__builtins__": __builtins__}
_stdout = io.StringIO()
_result = None

try:
    if not BT_FUNCTION_NAME:
        raise RuntimeError("O desafio não informou o nome da função esperada.")

    with contextlib.redirect_stdout(_stdout), contextlib.redirect_stderr(_stdout):
        exec(BT_USER_CODE, _namespace, _namespace)

        _student_function = _namespace.get(BT_FUNCTION_NAME)

        if not callable(_student_function):
            raise NameError(f"Função {BT_FUNCTION_NAME} não encontrada.")

        _results = []

        for _index, _test in enumerate(_tests):
            _args = _test.get("args", [])
            _expected = _test.get("expected")
            _received = _student_function(*_args)

            _results.append({
                "index": _index,
                "visible": bool(_test.get("visible", False)),
                "args": _safe_value(_args),
                "expected": _safe_value(_expected),
                "received": _safe_value(_received),
                "passed": _values_equal(_received, _expected),
            })

    _result = {
        "type": "result",
        "success": True,
        "results": _results,
        "logs": [line for line in _stdout.getvalue().splitlines() if line.strip()],
    }

except SyntaxError as _error:
    _result = {
        "type": "result",
        "success": False,
        "error": {
            "name": "SyntaxError",
            "message": str(_error),
            "line": _error.lineno,
            "text": (_error.text or "").strip(),
            "traceback": "",
        },
        "logs": [line for line in _stdout.getvalue().splitlines() if line.strip()],
    }

except BaseException as _error:
    _result = {
        "type": "result",
        "success": False,
        "error": {
            "name": type(_error).__name__,
            "message": str(_error),
            "line": None,
            "text": "",
            "traceback": traceback.format_exc(limit=6),
        },
        "logs": [line for line in _stdout.getvalue().splitlines() if line.strip()],
    }

json.dumps(_result, ensure_ascii=False)
`;

    const jsonResult = await runtime.runPythonAsync(harness);
    return JSON.parse(jsonResult);
}

self.onmessage = async (event) => {
    const payload = event.data || {};

    if (payload.type === "init") {
        try {
            await ensurePyodide();
        }
        catch (_error) {
            // O status de erro já foi enviado ao laboratório.
        }
        return;
    }

    if (payload.type !== "run") {
        return;
    }

    try {
        const result = await runStudentCode(payload);
        self.postMessage(result);
    }
    catch (error) {
        self.postMessage({
            type: "result",
            success: false,
            error: {
                name: error?.name || "PythonError",
                message: error?.message || String(error),
                line: null,
                text: "",
                traceback: "",
            },
            logs: [],
        });
    }
};
