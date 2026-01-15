from dataclasses import dataclass, asdict

@dataclass
class Example:
    id: str
    name: str

    def to_dict(self):
        return asdict(self)
    
    def validate(self):
        if not isinstance(self.id, str):
            raise ValueError("id must be a string")
        if not isinstance(self.name, str) or not self.name:
            raise ValueError("name must be a non-empty string")