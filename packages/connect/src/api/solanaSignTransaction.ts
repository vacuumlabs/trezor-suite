import { PROTO } from '../constants';
import { AbstractMethod } from '../core/AbstractMethod';
import { validateParams, getFirmwareRange } from './common/paramsValidator';
import { getMiscNetwork } from '../data/coinInfo';
import { validatePath } from '../utils/pathUtils';

export default class SolanaSignTransaction extends AbstractMethod<
    'solanaSignTransaction',
    PROTO.SolanaSignTx
> {
    hasBundle?: boolean;
    confirmed?: boolean;

    init() {
        this.requiredPermissions = ['read'];
        this.firmwareRange = getFirmwareRange(
            this.name,
            getMiscNetwork('Solana'),
            this.firmwareRange,
        );

        const { payload } = this;

        // validate bundle type
        validateParams(payload, [
            { name: 'signerPath', required: true },
            { name: 'serializedTx', type: 'string', required: true },
        ]);

        const signerPath = validatePath(payload.signerPath, 3);

        this.params = {
            signer_path_n: signerPath,
            serialized_tx: payload.serializedTx,
        };
    }

    get info() {
        return 'Sign Solana transaction';
    }

    async run() {
        const cmd = this.device.getCommands();
        const { message } = await cmd.typedCall('SolanaSignTx', 'SolanaSignedTx', this.params);
        return { signature: message.signature };
    }
}
