from .llm_factory import LLMFactory
from injector import singleton


from llama_index.core.base.llms.base import BaseLLM


@singleton
class PaidAPILLMFactory(LLMFactory):
    API_KEY_FIELD = "api_key"

    def create_llm(self, model: str, **kwargs) -> BaseLLM:
        if "gpt" in model:
            from llama_index.llms.openai import OpenAI

            return OpenAI(
                model=model, api_key=kwargs.get(PaidAPILLMFactory.API_KEY_FIELD)
            )
        else:
            raise ValueError(f"Unknown model {model}")
