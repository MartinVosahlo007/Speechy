import inspect
from functools import lru_cache
from typing import Any


def prepare_runtime_voice(runtime, voice_name: str, options: Any):
    if hasattr(runtime, "prepare_voice"):
        return runtime.prepare_voice(voice_name, options)
    return runtime.create_voice_clone_prompt(
        voice_name,
        getattr(options, "preprocess_prompt", True),
    )


def render_runtime_block(runtime, text: str, options: Any, prepared_voice):
    kwargs = {
        "text": text,
        "voice_name": options.voice,
        "language": getattr(options, "language", "cs"),
        "speed": getattr(options, "speed", 1.0),
    }
    if _supports_parameter(runtime, "prepared_voice"):
        kwargs["prepared_voice"] = prepared_voice
    elif _supports_parameter(runtime, "voice_clone_prompt"):
        kwargs["voice_clone_prompt"] = prepared_voice
    if _supports_parameter(runtime, "options"):
        kwargs["options"] = options
    return runtime.render_single_block(**kwargs)


@lru_cache(maxsize=None)
def _render_parameter_names(runtime_type: type, method_name: str) -> frozenset[str]:
    method = getattr(runtime_type, method_name)
    parameters = inspect.signature(method).parameters.values()
    if any(parameter.kind == inspect.Parameter.VAR_KEYWORD for parameter in parameters):
        return frozenset({"**kwargs"})
    return frozenset(parameter.name for parameter in parameters)


def _supports_parameter(runtime, parameter_name: str) -> bool:
    parameter_names = _render_parameter_names(type(runtime), "render_single_block")
    return parameter_name in parameter_names or "**kwargs" in parameter_names
