export interface Contract {
  $id: string;
  contractName: string;
  contractExpiryDate?: string;
  status: string;
  department?: string;
  division?: string;
  assignedManagers?: string[];
  fileId?: string;
  fileRef?: string;
  $createdAt?: string;
  $updatedAt?: string;
  amount?: number;
  daysUntilExpiry?: number;
  compliance?: string;
  contractType?: string;
  vendor?: string;
  contractNumber?: string;
  priority?: string;
  description?: string;
}

export interface MyContractsData {
  departments: Department[];
  userRole: 'Executive' | 'Admin' | 'Manager';
  userDepartment?: string;
  contracts: Contract[];
}

export interface Department {
  id: string;
  name: string;
  divisions: Division[];
}

export interface Division {
  id: string;
  name: string;
  contracts: Contract[];
}

export interface ContractsGridProps {
  contracts: Contract[];
  loading: boolean;
  error: string | null;
  userRole: 'executive' | 'admin' | 'manager';
}

export interface ManagerLayoutProps {
  userDivision?: string;
}

export interface UseMyContractsReturn {
  contracts: Contract[] | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}
