/* Battle Tank EMTI - Executor Python multi-funções - Professor Kazuo */

const PYODIDE_VERSION = "0.27.7";
const PYODIDE_SOURCES = [
    {
        name: "jsDelivr",
        moduleURL: `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/pyodide.mjs`,
        indexURL: `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`,
    },
    {
        name: "unpkg",
        moduleURL: `https://unpkg.com/pyodide@${PYODIDE_VERSION}/pyodide.mjs`,
        indexURL: `https://unpkg.com/pyodide@${PYODIDE_VERSION}/`,
    },
];

let pyodide = null;
let pyodidePromise = null;

function errorText(error) {
    return error?.message || error?.toString?.() || String(error || "Erro desconhecido");
}

async function ensurePyodide() {
    if (pyodide) return pyodide;
    if (!pyodidePromise) {
        pyodidePromise = (async () => {
            self.postMessage({ type:"status", status:"loading", message:"Carregando Python..." });
            const failures = [];
            for (const source of PYODIDE_SOURCES) {
                try {
                    const module = await import(source.moduleURL);
                    const instance = await module.loadPyodide({ indexURL: source.indexURL });
                    pyodide = instance;
                    self.postMessage({ type:"status", status:"ready", message:`Python pronto (${source.name})` });
                    return instance;
                } catch (error) {
                    failures.push(`${source.name}: ${errorText(error)}`);
                }
            }
            throw new Error(failures.join(" | "));
        })().catch((error) => {
            pyodidePromise = null;
            self.postMessage({ type:"status", status:"error", message:"Não foi possível carregar o Python no navegador.", detail:errorText(error) });
            throw error;
        });
    }
    return pyodidePromise;
}

async function runStudentCode(payload) {
    const runtime = await ensurePyodide();
    runtime.globals.set("BT_USER_CODE", String(payload.code || ""));
    runtime.globals.set("BT_CATALOG_JSON", JSON.stringify(payload.catalog || []));

    const harness = String.raw`
import contextlib
import io
import json
import math
import traceback


def _safe(value):
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, (list, tuple)):
        return [_safe(v) for v in value]
    if isinstance(value, dict):
        return {str(k): _safe(v) for k, v in value.items()}
    return repr(value)


def _equal(a, b):
    if isinstance(a, bool) or isinstance(b, bool):
        return a == b
    if isinstance(a, (int, float)) and isinstance(b, (int, float)):
        return math.isclose(float(a), float(b), rel_tol=0.0, abs_tol=1e-8)
    return a == b

_catalog = json.loads(BT_CATALOG_JSON)
_namespace = {"__builtins__": __builtins__}
_stdout = io.StringIO()
_result = None

try:
    with contextlib.redirect_stdout(_stdout), contextlib.redirect_stderr(_stdout):
        exec(BT_USER_CODE, _namespace, _namespace)
        _functions = []
        _defined_count = 0
        for _spec in _catalog:
            _fn = _namespace.get(_spec.get("functionName", ""))
            if not callable(_fn):
                continue
            _defined_count += 1
            _tests = []
            _passed = True
            _fn_error = None
            try:
                for _test in _spec.get("tests", []):
                    _args = _test.get("args", [])
                    _expected = _test.get("expected")
                    _received = _fn(*_args)
                    _ok = _equal(_received, _expected)
                    if not _ok:
                        _passed = False
                    _tests.append({
                        "args": _safe(_args),
                        "expected": _safe(_expected),
                        "received": _safe(_received),
                        "passed": _ok,
                    })
            except BaseException as _error:
                _passed = False
                _fn_error = {"name": type(_error).__name__, "message": str(_error)}
            _functions.append({
                "id": _spec.get("id"),
                "functionName": _spec.get("functionName"),
                "passed": _passed,
                "tests": _tests,
                "error": _fn_error,
            })

    _result = {
        "type":"result",
        "success":True,
        "functions":_functions,
        "definedCount":_defined_count,
        "logs":[line for line in _stdout.getvalue().splitlines() if line.strip()],
    }
except SyntaxError as _error:
    _result = {
        "type":"result",
        "success":False,
        "error":{"name":"SyntaxError","message":str(_error),"line":_error.lineno,"text":(_error.text or "").strip()},
        "logs":[line for line in _stdout.getvalue().splitlines() if line.strip()],
    }
except BaseException as _error:
    _result = {
        "type":"result",
        "success":False,
        "error":{"name":type(_error).__name__,"message":str(_error),"traceback":traceback.format_exc(limit=5)},
        "logs":[line for line in _stdout.getvalue().splitlines() if line.strip()],
    }
_result
`;

    let proxy;
    try {
        proxy = await runtime.runPythonAsync(harness);
        const result = proxy.toJs({ dict_converter:Object.fromEntries, create_proxies:false });
        self.postMessage(result);
    } finally {
        if (proxy && typeof proxy.destroy === "function") proxy.destroy();
        runtime.globals.delete("BT_USER_CODE");
        runtime.globals.delete("BT_CATALOG_JSON");
    }
}

self.onmessage = async (event) => {
    const payload = event.data || {};
    if (payload.type === "init") {
        try { await ensurePyodide(); } catch (_e) {}
        return;
    }
    if (payload.type === "run") {
        try { await runStudentCode(payload); }
        catch (error) {
            self.postMessage({ type:"result", success:false, error:{name:error?.name || "PythonRuntimeError", message:errorText(error)}, logs:[] });
        }
    }
};
