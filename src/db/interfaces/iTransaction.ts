/**
 * В отличие от биткоина, эфир может принимать только одну транзакцию на вход
 * https://ethereum.stackexchange.com/questions/2918/how-to-spend-ether-from-multiple-accounts/2926
 */
export interface ITransaction {
    txId: string;
    addressFrom: string;
    addressTo: string;
    amount: number;
    datetime: Date;
    confirmationNumber: number;
    blockNumber: number;
    type: number;
}