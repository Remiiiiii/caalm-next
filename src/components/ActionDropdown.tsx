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
import { actionsDropdownItems } from '../../constants';
import { constructDownloadUrl } from '@/lib/utils';
import Link from 'next/link';
import { Input } from './ui/input';
import { Button } from './ui/button';
import {
  deleteFile,
  renameFile,
  updateFileUsers,
  assignContract,
} from '@/lib/actions/file.actions';
import { listAllUsers, AppUser } from '@/lib/actions/user.actions';
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

const ActionDropdown = ({ file }: { file: Models.Document }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [action, setAction] = useState<ActionType | null>(null);
  const [name, setName] = useState(file.name);
  const [isLoading, setIsLoading] = useState(false);
  const [emails, setEmails] = useState<string[]>([]);
  const [managers, setManagers] = useState<AppUser[]>([]);
  const [selectedManagers, setSelectedManagers] = useState<string[]>([]);

  const path = usePathname();

  // Fetch managers when Assign dialog is opened
  useEffect(() => {
    if (action?.value === 'assign') {
      (async () => {
        const users = await listAllUsers();
        if (users) {
          setManagers(
            (users as Models.Document[])
              .filter((u) => u.role === 'manager')
              .map((u) => ({
                fullName: u.fullName,
                email: u.email,
                avatar: u.avatar,
                accountId: u.accountId,
                role: u.role,
                department: u.department,
                status: u.status,
              }))
          );
        } else {
          setManagers([]);
        }
      })();
    }
  }, [action]);

  const closeAllModals = (event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    setIsModalOpen(false);
    setIsDropdownOpen(false);
    setAction(null);
    setName(file.name);
    //setEmails([])
  };

  const handleAction = async () => {
    if (!action) return;
    setIsLoading(true);
    let success = false;

    const actions = {
      assign: () =>
        assignContract({
          fileId: file.$id,
          managerAccountIds: selectedManagers,
          path,
        }),
      rename: () =>
        renameFile({
          fileId: file.$id,
          name,
          extension: file.extension,
          path,
        }),
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
          style={{ pointerEvents: 'none' }}
        >
          <Card
            className="w-full max-w-2xl bg-white/80 backdrop-blur border border-white/40 shadow-lg"
            style={{ pointerEvents: 'auto' }}
          >
            {dialogHeader}
            <CardContent>
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
                    {managers.map((manager: AppUser) => (
                      <tr key={manager.accountId}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedManagers.includes(
                              manager.accountId
                            )}
                            onChange={() => {
                              setSelectedManagers((prev) =>
                                prev.includes(manager.accountId)
                                  ? prev.filter(
                                      (id) => id !== manager.accountId
                                    )
                                  : [...prev, manager.accountId]
                              );
                            }}
                          />
                        </td>
                        <td className="px-2 py-1">{manager.fullName}</td>
                        <td className="px-2 py-1">{manager.department}</td>
                        <td className="px-2 py-1">{manager.role}</td>
                        <td className="px-2 py-1">{manager.status}</td>
                      </tr>
                    ))}
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
                onClick={handleAction}
                disabled={isLoading || selectedManagers.length === 0}
                className="modal-submit-button"
              >
                <p className="capitalize">Assign</p>
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
                onClick={handleAction}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <Card className="w-[500px] max-w-2xl text-slate-700 bg-white/80 backdrop-blur border border-white/40 shadow-lg">
            {dialogHeader}
            <CardContent>
              <FileDetails file={file} />
            </CardContent>
            <CardFooter className="flex flex-col gap-3 md:flex-row">
              <Button
                onClick={(e) => closeAllModals(e)}
                className="modal-cancel-button"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <Card className="w-[500px] max-w-2xl text-slate-700 bg-white/80 backdrop-blur border border-white/40 shadow-lg">
            {dialogHeader}
            <CardContent>
              <ShareInput
                file={file}
                onInputChange={setEmails}
                onRemove={handleRemoveUser}
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
                onClick={handleAction}
                disabled={isLoading}
                className="modal-submit-button"
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
                <span className="delete-file-name">{file.name}</span>?
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
  };

  // Only show Assign if file name contains 'Contract'
  const isContractFile = file.name.toLowerCase().includes('contract');
  const filteredActions = isContractFile
    ? actionsDropdownItems
    : actionsDropdownItems.filter((action) => action.value !== 'assign');

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
            {file.name}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {filteredActions.map((actionItem) => (
            <DropdownMenuItem
              key={actionItem.value}
              className="shad-dropdown-item"
              onClick={() => {
                setAction(actionItem);
                if (
                  ['assign', 'rename', 'delete', 'share', 'details'].includes(
                    actionItem.value
                  )
                ) {
                  setIsModalOpen(true);
                }
              }}
            >
              {actionItem.value === 'download' ? (
                <Link
                  href={constructDownloadUrl(file.bucketFileId)}
                  download={file.name}
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
    </Dialog>
  );
};

export default ActionDropdown;
