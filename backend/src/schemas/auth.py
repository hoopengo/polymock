from pydantic import BaseModel, Field


class UserCreate(BaseModel):
    """Schema for user registration."""

    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)


class UserResponse(BaseModel):
    """Schema for user response (excludes password)."""

    id: int
    username: str
    balance: float
    is_admin: bool = False
    avatar_url: str | None = None
    theme: str = "dark"
    email_notifications: bool = True

    model_config = {"from_attributes": True}


class ProfileUpdate(BaseModel):
    """Schema for updating user profile."""

    avatar_url: str | None = None
    theme: str | None = Field(None, pattern="^(dark|light)$")
    email_notifications: bool | None = None


class PasswordChange(BaseModel):
    """Schema for changing password."""

    current_password: str
    new_password: str = Field(..., min_length=6)


class Token(BaseModel):
    """Schema for JWT token response."""

    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Schema for decoded token data."""

    username: str | None = None
