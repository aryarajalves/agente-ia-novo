class UsageLog:
    def __init__(self, mp=0, mc=0, xp=0, xc=0):
        self.mini_prompt = mp
        self.mini_completion = mc
        self.main_prompt = xp
        self.main_completion = xc

    @property
    def prompt_tokens(self):
        return self.mini_prompt + self.main_prompt

    @property
    def completion_tokens(self):
        return self.mini_completion + self.main_completion

    @property
    def total_tokens(self):
        return self.prompt_tokens + self.completion_tokens

    def get(self, key, default=None):
        try:
            return getattr(self, key, default)
        except AttributeError:
            return default
        
    def to_dict(self):
        return {
            "mini_prompt": self.mini_prompt,
            "mini_completion": self.mini_completion,
            "main_prompt": self.main_prompt,
            "main_completion": self.main_completion,
            "prompt_tokens": self.prompt_tokens,
            "completion_tokens": self.completion_tokens,
            "total_tokens": self.total_tokens
        }
