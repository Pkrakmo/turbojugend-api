export interface User {
    ID: number;
    User_ID: string;
    GoogleUserId: string;
    Email: string;
    Role: string;
    Status: string;
    CreatedAt: Date;
    UpdatedAt: Date;
}

export class UserModel implements User {
    ID!: number;
    User_ID!: string;
    GoogleUserId!: string;
    Email!: string;
    Role!: string;
    Status!: string;
    CreatedAt!: Date;
    UpdatedAt!: Date;

    constructor(data: Partial<User>) {
        Object.assign(this, {
            ID: data.ID || 0,
            User_ID: data.User_ID || crypto.randomUUID(),
            GoogleUserId: data.GoogleUserId || '',
            Email: data.Email || '',
            Role: data.Role || 'user',
            Status: data.Status || 'pending',
            CreatedAt: data.CreatedAt || new Date(),
            UpdatedAt: data.UpdatedAt || new Date()
        });
    }
}