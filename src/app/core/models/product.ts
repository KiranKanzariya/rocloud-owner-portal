export interface Product {
  id: string;
  name: string;
  bottleSize: string;
  defaultRate: number;
  unit: string;
  hsn?: string | null;
  isActive: boolean;
  createdAt: string;
}
