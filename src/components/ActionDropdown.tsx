'use client';

import { useState, useEffect } from 'react';
import { Dialog } from '@/components/ui/dialog';
import Image from 'next/image';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Models } from 'node-appwrite';
import { actionsDropdownItems, formatDepartmentName } from '../../constants';
import { constructDownloadUrl, constructFileUrl } from '@/lib/utils';
import Link from 'next/link';
import { Input } from './ui/input';
import { Button } from './ui/button';
import {
  deleteFile,
  renameFile,
  updateFileUsers,
  assignContract,
} from '@/lib/actions/file.actions';
import { assignContractToDepartment } from '@/lib/actions/notification.actions';
import { AppUser } from '@/lib/actions/user.actions';
import { usePathname } from 'next/navigation';
import { FileDetails } from './ActionsModalContent';
import { ShareInput } from '@/components/ActionsModalContent';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from './ui/card';
import { useContractStatusEnums } from '@/hooks/useContractStatusEnums';
import { useUpdateContractStatus } from '@/hooks/useUpdateContractStatus';
import { useDepartmentAssignment } from '@/hooks/useDepartmentAssignment';
import DocumentViewer from './DocumentViewer';

const ActionDropdown = ({
  file,
  onStatusChange,
}: {
  file: Models.Document;
  onStatusChange?: () => void;
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [action, setAction] = useState<ActionType | null>(null);
  const [name, setName] = useState(file?.name || file?.contractName || '');
  const [isLoading, setIsLoading] = useState(false);
  const [emails, setEmails] = useState<string[]>([]);

  const [selectedStatus, setSelectedStatus] = useState<string>(
    file?.status || ''
  );
  const {
    departmentEnums,
    filteredManagers,
    selectedDepartment,
    selectedManagers,
    fetchData: fetchDeptData,
    handleDepartmentChange,
    handleManagerToggle,
  } = useDepartmentAssignment();
  const path = usePathname() || '';
  const { enums: statusOptions, error: statusError } = useContractStatusEnums();
  const { updateStatus } = useUpdateContractStatus({ onStatusChange });
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  // Fetch department data when Assign dialog is opened
  useEffect(() => {
    if (action?.value === 'assign') {
      fetchDeptData();
    }
  }, [action?.value, fetchDeptData]);

  const closeAllModals = (event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    setIsModalOpen(false);
    setIsDropdownOpen(false);
    setAction(null);
    setName(file.name || file.contractName || '');
    //setEmails([])
  };

  const handleAction = async () => {
    if (!action) return;
    setIsLoading(true);
    let success = false;

    const actions = {
      assign: async () => {
        if (!file.contractId) {
          throw new Error(
            'This file does not have an associated contract. Only contract files can be assigned.'
          );
        }

        const assignResult = await assignContract({
          fileId: file.contractId,
          managerAccountIds: selectedManagers,
          path,
          fileDocumentId: file.$id, // Pass the file document ID
        });

        // Also assign department if selected
        if (selectedDepartment) {
          await assignContractToDepartment({
            contractId: file.contractId,
            department: selectedDepartment,
          });
        }

        return assignResult;
      },
      rename: () => {
        // Remove extension if user included it
        let baseName = name;
        if (
          baseName.toLowerCase().endsWith(`.${file.extension.toLowerCase()}`)
        ) {
          baseName = baseName.slice(0, -file.extension.length - 1);
        }
        return renameFile({
          fileId: file.$id,
          name: baseName,
          extension: file.extension,
          path,
        });
      },
      share: () =>
        updateFileUsers({
          fileId: file.$id,
          emails,
          path,
        }),
      delete: () =>
        deleteFile({
          fileId: file.$id,
          bucketFileId: file.bucketFileId,
          path,
        }),
    };

    success = await actions[action.value as keyof typeof actions]();

    if (success) {
      closeAllModals();
    }

    setIsLoading(false);
  };

  const handleRemoveUser = async (email: string) => {
    const updateEmails = emails.filter((e) => e !== email);

    const success = await updateFileUsers({
      fileId: file.$id,
      emails: updateEmails,
      path,
    });

    if (success) {
      setEmails(updateEmails);
    }
    closeAllModals();
  };

  const handleStatusChange = async () => {
    setIsLoading(true);
    const contractId = file.contractId || file.$id;
    const success = await updateStatus({
      fileId: contractId,
      status: selectedStatus,
      path,
    });
    if (success) closeAllModals();
    setIsLoading(false);
  };

  const renderDialogContent = () => {
    if (!action) return null;
    const { value, label } = action;
    // All dialogs styled like Assign (NotificationCenter)
    const dialogHeader = (
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="sidebar-gradient-text">{label}</CardTitle>
        <Button variant="ghost" size="icon" onClick={closeAllModals}>
          <span className="sr-only">Close</span>×
        </Button>
      </CardHeader>
    );
    if (value === 'assign') {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <Card className="w-[500px] max-w-2xl bg-white/80 backdrop-blur border border-white/40 shadow-lg">
            {dialogHeader}
            <CardContent>
              <div className="mb-4">
                <div className="mb-2 text-sm text-slate-700">
                  Select department for this contract:
                </div>
                <div className="flex flex-col gap-2 mb-4">
                  {departmentEnums.length > 0 ? (
                    departmentEnums.map((dept) => (
                      <label
                        key={dept}
                        className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded"
                      >
                        <input
                          type="radio"
                          name="contract-department"
                          value={dept}
                          checked={selectedDepartment === dept}
                          onChange={() => handleDepartmentChange(dept)}
                          disabled={isLoading}
                          className="cursor-pointer"
                        />
                        <span className="text-sm cursor-pointer">
                          {formatDepartmentName(dept)}
                        </span>
                      </label>
                    ))
                  ) : (
                    <div className="text-sm text-slate-500">
                      {isLoading
                        ? 'Loading departments...'
                        : 'No departments available'}
                    </div>
                  )}
                </div>
              </div>
              <div className="mb-2 text-sm text-slate-700">
                Select manager(s) to assign this contract:
              </div>
              <div className="overflow-x-auto rounded-lg border border-white/30 mb-4">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50/80">
                    <tr>
                      <th></th>
                      <th className="px-2 py-1 text-left text-[14px] font-semibold text-slate-700">
                        Name
                      </th>
                      <th className="px-2 py-1 text-left text-[14px] font-semibold text-slate-700">
                        Department
                      </th>
                      <th className="px-2 py-1 text-left text-[14px] font-semibold text-slate-700">
                        Role
                      </th>
                      <th className="px-2 py-1 text-left text-[14px] font-semibold text-slate-700">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-700 text-sm">
                    {filteredManagers.length > 0 ? (
                      filteredManagers.map((manager: AppUser) => (
                        <tr
                          key={manager.accountId}
                          className={`hover:bg-slate-50 cursor-pointer ${
                            selectedManagers.includes(manager.accountId)
                              ? 'bg-blue-50'
                              : ''
                          }`}
                          onClick={() => handleManagerToggle(manager.accountId)}
                        >
                          <td
                            className="p-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              key={`${
                                manager.accountId
                              }-${selectedManagers.includes(
                                manager.accountId
                              )}`}
                              checked={selectedManagers.includes(
                                manager.accountId
                              )}
                              onChange={() =>
                                handleManagerToggle(manager.accountId)
                              }
                              className="cursor-pointer"
                            />
                          </td>
                          <td className="px-2 py-1">{manager.fullName}</td>
                          <td className="px-2 py-1">
                            {manager.department
                              ? formatDepartmentName(manager.department)
                              : 'N/A'}
                          </td>
                          <td className="px-2 py-1">{manager.role}</td>
                          <td className="px-2 py-1">{manager.status}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={5}
                          className="text-center py-4 text-slate-500"
                        >
                          {isLoading
                            ? 'Loading managers...'
                            : 'No managers available'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3 md:flex-row">
              <Button
                onClick={(e) => closeAllModals(e)}
                className="modal-cancel-button"
              >
                Cancel
              </Button>
              <Button
                //stop propagation
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleAction();
                }}
                disabled={
                  isLoading ||
                  selectedManagers.length === 0 ||
                  !selectedDepartment
                }
                className="modal-submit-button"
              >
                <p className="capitalize">Assign Contract</p>
                {isLoading && (
                  <Image
                    src="/assets/icons/loader.svg"
                    alt="loader"
                    width={24}
                    height={24}
                    className="animate-spin"
                  />
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }
    // Rename dialog
    if (value === 'rename') {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <Card className="w-[500px] max-w-2xl bg-white/80 backdrop-blur border border-white/40 shadow-lg">
            {dialogHeader}
            <CardContent>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
              />
            </CardContent>
            <CardFooter className="flex flex-col gap-3 md:flex-row">
              <Button
                onClick={(e) => closeAllModals(e)}
                className="modal-cancel-button"
              >
                Cancel
              </Button>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleAction();
                }}
                disabled={isLoading}
                className="modal-submit-button"
              >
                <p className="capitalize">Rename</p>
                {isLoading && (
                  <Image
                    src="/assets/icons/loader.svg"
                    alt="loader"
                    width={24}
                    height={24}
                    className="animate-spin"
                  />
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }
    // Details dialog
    if (value === 'details') {
      return (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
          style={{ pointerEvents: 'none' }}
        >
          <Card
            className="w-[500px] max-w-2xl text-slate-700 bg-white/80 backdrop-blur border border-white/40 shadow-lg"
            style={{ pointerEvents: 'none' }}
          >
            {dialogHeader}
            <CardContent>
              <FileDetails file={file} />
            </CardContent>
            <CardFooter className="flex flex-col gap-3 md:flex-row">
              <Button
                onClick={(e) => closeAllModals(e)}
                className="modal-cancel-button"
                style={{ pointerEvents: 'auto' }}
              >
                Cancel
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }
    // Share dialog
    if (value === 'share') {
      return (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
          style={{ pointerEvents: 'none' }}
        >
          <Card
            className="w-[500px] max-w-2xl text-slate-700 bg-white/80 backdrop-blur border border-white/40 shadow-lg"
            style={{ pointerEvents: 'none' }}
          >
            {dialogHeader}
            <CardContent style={{ pointerEvents: 'auto' }}>
              <ShareInput
                file={file}
                onInputChange={setEmails}
                onRemove={handleRemoveUser}
              />
            </CardContent>
            <CardFooter
              className="flex flex-col gap-3 md:flex-row"
              style={{ pointerEvents: 'auto' }}
            >
              <Button
                onClick={(e) => closeAllModals(e)}
                className="modal-cancel-button"
                style={{ pointerEvents: 'auto' }}
              >
                Cancel
              </Button>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleAction();
                }}
                disabled={isLoading}
                className="modal-submit-button"
                style={{ pointerEvents: 'auto' }}
              >
                <p className="capitalize">Share</p>
                {isLoading && (
                  <Image
                    src="/assets/icons/loader.svg"
                    alt="loader"
                    width={24}
                    height={24}
                    className="animate-spin"
                  />
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }
    // Delete dialog
    if (value === 'delete') {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <Card className="w-[500px] max-w-2xl text-slate-700 bg-white/80 backdrop-blur border border-white/40 shadow-lg">
            {dialogHeader}
            <CardContent>
              <p className="delete-confirmation">
                Are you sure you want to delete{' '}
                <span className="delete-file-name">
                  {file.name || file.contractName}
                </span>
                ?
              </p>
            </CardContent>
            <CardFooter className="flex flex-col gap-3 md:flex-row">
              <Button
                onClick={(e) => closeAllModals(e)}
                className="modal-cancel-button"
              >
                Cancel
              </Button>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleAction();
                }}
                disabled={isLoading}
                className="modal-submit-button"
              >
                <p className="capitalize">Delete</p>
                {isLoading && (
                  <Image
                    src="/assets/icons/loader.svg"
                    alt="loader"
                    width={24}
                    height={24}
                    className="animate-spin"
                  />
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }
    // Status dialog
    if (value === 'status') {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <Card className="w-[400px] max-w-2xl bg-white/80 backdrop-blur border border-white/40 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="sidebar-gradient-text">
                Change Status
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={closeAllModals}>
                <span className="sr-only">Close</span>×
              </Button>
            </CardHeader>
            <CardContent>
              <div className="mb-2 text-sm text-slate-700">
                Select a new status for this contract:
              </div>
              {statusError && (
                <div className="text-red-500 mb-2">{statusError}</div>
              )}
              <div className="flex flex-col gap-2">
                {statusOptions.map((option) => (
                  <label key={option} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="contract-status"
                      value={option}
                      checked={selectedStatus === option}
                      onChange={() => setSelectedStatus(option)}
                      disabled={isLoading}
                    />
                    <span className="capitalize">
                      {option.replace('-', ' ')}
                    </span>
                  </label>
                ))}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3 md:flex-row">
              <Button onClick={closeAllModals} className="modal-cancel-button">
                Cancel
              </Button>
              <Button
                //stop propagation
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleStatusChange();
                }}
                disabled={isLoading || !selectedStatus}
                className="modal-submit-button"
                style={{ pointerEvents: 'auto' }}
              >
                <p className="capitalize">Update Status</p>
                {isLoading && (
                  <Image
                    src="/assets/icons/loader.svg"
                    alt="loader"
                    width={24}
                    height={24}
                    className="animate-spin"
                  />
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }

    if (value === 'review') {
      return null; // DocumentViewer is rendered separately
    }
  };

  // Safety check: ensure file object exists and has required properties
  if (!file) {
    console.error('ActionDropdown: file prop is undefined or null');
    return null;
  }

  // Only show Assign and Status if file name contains 'Contract'
  const fileName = file.name || file.contractName || '';
  const isContractFile = fileName.toLowerCase().includes('contract');
  const filteredActions = isContractFile
    ? actionsDropdownItems
    : actionsDropdownItems.filter(
        (action) => !['assign', 'status'].includes(action.value)
      );

  return (
    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
      <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
        <DropdownMenuTrigger className="shad-no-focus">
          <Image
            src="/assets/icons/dots.svg"
            alt="dots"
            width={34}
            height={34}
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel className="max-w-[200px] truncate">
            {file.name || file.contractName}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {filteredActions.map((actionItem) => (
            <DropdownMenuItem
              key={actionItem.value}
              className="shad-dropdown-item"
              onClick={() => {
                setAction(actionItem);
                if (actionItem.value === 'review') {
                  setIsViewerOpen(true);
                } else if (
                  [
                    'assign',
                    'rename',
                    'delete',
                    'share',
                    'details',
                    'status',
                  ].includes(actionItem.value)
                ) {
                  setIsModalOpen(true);
                }
              }}
            >
              {actionItem.value === 'download' ? (
                <Link
                  href={constructDownloadUrl(file.bucketFileId)}
                  download={file.name || file.contractName}
                  className="flex items-center gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Image
                    src={actionItem.icon}
                    alt={actionItem.label}
                    width={30}
                    height={30}
                  />
                  {actionItem.label}
                </Link>
              ) : (
                <div className="flex items-center gap-2">
                  <Image
                    src={actionItem.icon}
                    alt={actionItem.label}
                    width={30}
                    height={30}
                  />
                  {actionItem.label}
                </div>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {renderDialogContent()}
      <DocumentViewer
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        file={{
          id: file.$id,
          name: file.name || file.contractName || '',
          type: file.extension || 'pdf',
          size: file.size || 'Unknown',
          url: constructFileUrl(file.bucketFileId),
          createdAt: file.$createdAt,
          expiresAt: file.contractExpiryDate,
          createdBy: file.owner || 'Unknown',
          description: file.description || '',
        }}
      />
    </Dialog>
  );
};

export default ActionDropdown;
