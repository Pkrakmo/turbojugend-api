export interface Membership {
    ID: number;
    User_ID: string;
    Chapter_Id: string;
    Chapter_Rank: string;
    Chapter_Status: string;
    Warrior_Name: string;
    CreatedAt: Date;
    UpdatedAt: Date;
}

export class MembershipModel implements Membership {
    ID!: number;
    User_ID!: string;
    Chapter_Id!: string;
    Chapter_Rank!: string;
    Chapter_Status!: string;
    Warrior_Name!: string;
    CreatedAt!: Date;
    UpdatedAt!: Date;

    constructor(data: Partial<Membership>) {
        Object.assign(this, {
            ID: data.ID || 0,
            User_ID: data.User_ID || '',
            Chapter_Id: data.Chapter_Id || '',
            Chapter_Rank: data.Chapter_Rank || 'member',
            Chapter_Status: data.Chapter_Status || 'pending',
            Warrior_Name: data.Warrior_Name || '',
            CreatedAt: data.CreatedAt || new Date(),
            UpdatedAt: data.UpdatedAt || new Date()
        });
    }
} 