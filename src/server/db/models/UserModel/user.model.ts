import { createModel } from "../createModel"
import { UserSchema, type User } from "@/schemas/user.schema"

export const UserModel = createModel<User, Record<never, never>, "users">({
    collectionName: "users",
    ModelSchema: UserSchema,
    searchConfig: { handlers: {} },
})
