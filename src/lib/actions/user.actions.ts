"use server";

import { ID, Query } from "node-appwrite";
import { createAdminClient } from "../appwrite";
import { appwriteConfig } from "../appwrite/config";
import { parseStringify } from "../utils";

const getUserByEmail = async (email: string) => {
  const { databases } = await createAdminClient();
  const result = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.usersCollectionId,
    [Query.equal("email", email)]
  );

  return result.total > 0 ? result.documents[0] : null;
};

const handleError = (error: unknown, message: string) => {
  console.log(error, message);
  throw error;
};

const sendEmailOTP = async ({ email }: { email: string }) => {
  const { account } = await createAdminClient();

  try {
    {
      /*TODO: change ID.unique() to a UUID*/
    }
    const session = await account.createEmailToken(ID.unique(), email);
    return session.userId;
  } catch (error) {
    handleError(error, "Failed to send email OTP");
  }
};

export const createAccount = async ({
  fullName,
  email,
}: {
  fullName: string;
  email: string;
}) => {
  const existingUser = await getUserByEmail(email);

  const accountId = await sendEmailOTP({ email });
  if (!accountId) {
    throw new Error("Failed to send email OTP");
  }
  if (!existingUser) {
    const { databases } = await createAdminClient();

    await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      ID.unique(),
      {
        fullName,
        email,
        avatar:
          "https://www.google.com/imgres?q=avatar%20placeholder&imgurl=https%3A%2F%2Fcdn.pixabay.com%2Fphoto%2F2016%2F08%2F08%2F09%2F17%2Favatar-1577909_960_720.png&imgrefurl=https%3A%2F%2Fpixabay.com%2Fvectors%2Favatar-icon-placeholder-facebook-1577909%2F&docid=cyPowwVV5ZV6IM&tbnid=x3mZLbZEUtS7xM&vet=12ahUKEwjny7T8x5KOAxWgQjABHQlNNaQQM3oFCIcBEAA..i&w=720&h=720&hcb=2&ved=2ahUKEwjny7T8x5KOAxWgQjABHQlNNaQQM3oFCIcBEAA",
        accountId,
      }
    );
  }

  return parseStringify({ accountId });
};
