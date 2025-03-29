export interface Chapter {
    ID: number;
    Chapter_Id: string;
    Chapter_Name: string;
    Chapter_Description: string;
    Created_By: string;
    Status: string;
    CreatedAt: Date;
    UpdatedAt: Date;
}

export class ChapterModel implements Chapter {
    ID!: number;
    Chapter_Id!: string;
    Chapter_Name!: string;
    Chapter_Description!: string;
    Created_By!: string;
    Status!: string;
    CreatedAt!: Date;
    UpdatedAt!: Date;

    constructor(data: Partial<Chapter>) {
        Object.assign(this, {
            ID: data.ID || 0,
            Chapter_Id: data.Chapter_Id || crypto.randomUUID(),
            Chapter_Name: data.Chapter_Name || '',
            Chapter_Description: data.Chapter_Description || '',
            Created_By: data.Created_By || '',
            Status: data.Status || 'pending',
            CreatedAt: data.CreatedAt || new Date(),
            UpdatedAt: data.UpdatedAt || new Date()
        });
    }
}