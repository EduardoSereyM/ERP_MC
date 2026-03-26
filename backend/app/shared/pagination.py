from typing import Literal
from pydantic import BaseModel, Field


class PaginacionParams(BaseModel):
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=20, ge=1, le=100)
    orden: str = Field(default="created_at")
    direccion: Literal["asc", "desc"] = Field(default="desc")

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.limit
