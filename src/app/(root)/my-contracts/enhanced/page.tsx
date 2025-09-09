'use client';

import React, { useState, useEffect } from 'react';
import { useUserRole } from '@/hooks/useUserRole';
import {
  Card as UICard,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, FileText, Building2, Users, Search } from 'lucide-react';
import Link from 'next/link';
import { UIFileDoc } from '@/types/files';
import {
  getFiles,
  getContractsByUserDivision,
} from '@/lib/actions/file.actions';
import {
  ContractDepartment,
  DIVISION_TO_DEPARTMENT,
} from '../../../../../constants';
import Sort from '@/components/Sort';
import FileCard from '@/components/Card';
import SearchDashboard from '@/components/SearchDashboard';
import EnhancedSearch from '@/components/EnhancedSearch';
import SearchResultHighlight from '@/components/SearchResultHighlight';

const EnhancedMyContractsPage = () => {
  const { role, division, loading, error } = useUserRole();
  const [contracts, setContracts] = useState<UIFileDoc[]>([]);
  const [filteredContracts, setFilteredContracts] = useState<UIFileDoc[]>([]);
  const [selectedDepartment, setSelectedDepartment] =
    useState<ContractDepartment>('Operations');
  const [selectedDivision, setSelectedDivision] = useState<string>('');
  const [sortBy] = useState<string>('$createdAt-desc');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [currentQuery, setCurrentQuery] = useState('');
  const [showSearchDashboard, setShowSearchDashboard] = useState(false);

  // Function to refresh contracts data
  const refreshContracts = async () => {
    try {
      if (role === 'manager' && division) {
        // For managers, get contracts filtered by their division
        const divisionContracts = await getContractsByUserDivision(division);

        // Get the corresponding file documents for these contracts
        const contractFiles: UIFileDoc[] = [];
        for (const contract of divisionContracts) {
          if (contract.fileId) {
            try {
              const fileResponse = await getFiles({
                types: ['document'],
                searchText: '',
                sort: sortBy,
              });
              const file = fileResponse.documents.find(
                (f: UIFileDoc) => f.$id === contract.fileId
              );
              if (file) {
                contractFiles.push(file as UIFileDoc);
              }
            } catch (error) {
              console.error('Error fetching file for contract:', error);
            }
          }
        }

        setContracts(contractFiles);
        setFilteredContracts(contractFiles);
      } else {
        // For executives/admins, get all contracts
        const filesResponse = await getFiles({
          types: ['document'],
          searchText: '',
          sort: sortBy,
        });

        const contractFiles = filesResponse.documents as UIFileDoc[];
        setContracts(contractFiles);
        setFilteredContracts(contractFiles);
      }
    } catch (err) {
      console.error('Error refreshing contracts:', err);
    }
  };

  useEffect(() => {
    if (!loading && role) {
      refreshContracts();
    }
  }, [role, division, loading]);

  const handleSearchResults = (results: any[]) => {
    setSearchResults(results);
    setCurrentQuery('');
  };

  const handleSearchQuery = (query: string) => {
    setCurrentQuery(query);
  };

  const getTotalSize = () => {
    return filteredContracts.reduce((total, contract) => {
      return total + (contract.size || 0);
    }, 0);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const totalSizeFormatted = formatFileSize(getTotalSize());

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading contracts...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/my-contracts">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Contracts
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Enhanced Contract Management
            </h1>
            <p className="text-gray-600">
              Advanced search and filtering for your contracts
            </p>
          </div>
        </div>
        <Button
          onClick={() => setShowSearchDashboard(!showSearchDashboard)}
          variant={showSearchDashboard ? 'default' : 'outline'}
        >
          <Search className="h-4 w-4 mr-2" />
          {showSearchDashboard ? 'Hide Search' : 'Show Search'}
        </Button>
      </div>

      {/* Search Dashboard */}
      {showSearchDashboard && (
        <SearchDashboard onSearchResults={handleSearchResults} />
      )}

      {/* Search Results */}
      {searchResults.length > 0 && (
        <UICard>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search Results ({searchResults.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {searchResults.slice(0, 10).map((result, index) => (
                <div
                  key={index}
                  className="p-4 border rounded-lg hover:bg-gray-50"
                >
                  <h3 className="font-semibold text-lg">
                    <SearchResultHighlight
                      text={result.contractName || result.name || 'Untitled'}
                      query={currentQuery}
                    />
                  </h3>
                  <div className="mt-2 text-sm text-gray-600">
                    <p>
                      <strong>Type:</strong> {result.type}
                    </p>
                    {result.vendor && (
                      <p>
                        <strong>Vendor:</strong>{' '}
                        <SearchResultHighlight
                          text={result.vendor}
                          query={currentQuery}
                        />
                      </p>
                    )}
                    {result.department && (
                      <p>
                        <strong>Department:</strong> {result.department}
                      </p>
                    )}
                    {result.status && (
                      <p>
                        <strong>Status:</strong> {result.status}
                      </p>
                    )}
                    {result.amount && (
                      <p>
                        <strong>Amount:</strong> $
                        {result.amount.toLocaleString()}
                      </p>
                    )}
                    <p>
                      <strong>Search Score:</strong>{' '}
                      {result.searchScore?.toFixed(2)}
                    </p>
                    <p>
                      <strong>Created:</strong>{' '}
                      {new Date(result.$createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
              {searchResults.length > 10 && (
                <div className="text-center pt-4">
                  <Button variant="outline">
                    View All {searchResults.length} Results
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </UICard>
      )}

      {/* Main Content */}
      {role && (
        <div className="space-y-6">
          {/* Role-based Access */}
          {role === 'manager' && division ? (
            <div className="space-y-6">
              <UICard>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    {division} Division Contracts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <p className="body-1">
                        Total: <span className="h5">{totalSizeFormatted}</span>
                        <span className="ml-2 text-slate-600">
                          ({filteredContracts.length} contracts)
                        </span>
                      </p>
                      <Sort />
                    </div>

                    {filteredContracts.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredContracts.map((contract) => (
                          <FileCard
                            key={contract.$id}
                            file={contract}
                            status={contract.status}
                            expirationDate={contract.contractExpiryDate}
                            onRefresh={refreshContracts}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                        <p className="body-1 text-slate-600">
                          No contracts found for your division
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </UICard>
            </div>
          ) : role === 'executive' || role === 'admin' ? (
            <div className="space-y-6">
              <UICard>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    All Contracts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <p className="body-1">
                        Total: <span className="h5">{totalSizeFormatted}</span>
                        <span className="ml-2 text-slate-600">
                          ({filteredContracts.length} contracts)
                        </span>
                      </p>
                      <Sort />
                    </div>

                    {filteredContracts.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredContracts.map((contract) => (
                          <FileCard
                            key={contract.$id}
                            file={contract}
                            status={contract.status}
                            expirationDate={contract.contractExpiryDate}
                            onRefresh={refreshContracts}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                        <p className="body-1 text-slate-600">
                          No contracts found
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </UICard>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Access Denied */}
              <UICard>
                <CardContent className="p-8 text-center">
                  <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-700 mb-2">
                    Access Denied
                  </h3>
                  <p className="text-slate-500">
                    You don't have permission to view contracts
                  </p>
                </CardContent>
              </UICard>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EnhancedMyContractsPage;
