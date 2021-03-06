import Logger from 'lib/logger';
import Utils from 'lib/utils';
import md5 from 'md5';

import { LOCALSTORAGE_NAMESPACE } from 'lib/constants';

const logger = new Logger('nodes');
const DEFAULT_NODE = 'MAINNET';

const nodeSelector = {
    init() {
        this._node = DEFAULT_NODE;
        this._storageKey = `${ LOCALSTORAGE_NAMESPACE }_NODES`;

        this._defaultNodes = {
            MAINNET: {
                name: 'Mainnet',
                full: 'https://api.trongrid.io',
                solidity: 'https://api.trongrid.io',
                event: 'https://api.trongrid.io',
                default: true,
                mainnet: true
            },
            TESTNET: {
                name: 'Shasta Testnet',
                full: 'https://api.shasta.trongrid.io',
                solidity: 'https://api.shasta.trongrid.io',
                event: 'https://api.shasta.trongrid.io',
                default: true,
                mainnet: false
            }
        };

        this._readUserNodes();
    },

    _readUserNodes() {
        logger.info('Reading nodes from local storage');

        this._userNodes = {};
        this._nodes = {};

        const {
            selectedNode,
            nodes
        } = Utils.loadStorage(this._storageKey);

        this._userNodes = nodes || {};

        this._nodes = {
            ...this._defaultNodes,
            ...this._userNodes
        };

        logger.info(`Found ${ Object.keys(this._userNodes).length } user nodes`);

        if(selectedNode)
            this.setNode(selectedNode);
    },

    _saveState() {
        logger.info('Writing node configuration to local storage');

        Utils.saveStorage({
            selectedNode: this._node,
            nodes: this._userNodes
        }, this._storageKey);
    },

    addNode(node) {
        const error = Utils.validateNode(node);

        if(error) {
            logger.warn('Invalid node provided', node);
            logger.error('Node error:', error);

            return { error };
        }

        logger.info('Adding new node', node);

        const {
            full,
            solidity,
            event,
            mainnet
        } = node;

        const name = node.name.trim().toLowerCase();
        const nodeHash = md5([ full.toLowerCase(), solidity.toLowerCase(), event.toLowerCase() ].join('&'));

        if(Object.keys(this._nodes).includes(nodeHash))
            return { error: 'Node already exists' };

        if(Object.values(this._nodes).some(node => node.name.toLowerCase() === name))
            return { error: 'Name already in use' };

        const newNode = {
            default: false,
            name,
            full,
            solidity,
            event,
            mainnet
        };

        this._userNodes[nodeHash] = newNode;
        this._nodes[nodeHash] = newNode;

        this._saveState();

        return { nodeHash };
    },

    removeNode(nodeHash) {
        logger.info(`Removing node ${ nodeHash }`);

        // Only remove from _userNodes to prevent removing default node
        delete this._userNodes[nodeHash];

        this._saveState();
        this._readUserNodes();
    },

    setNode(nodeHash) {
        if(!nodeHash || !this._nodes[nodeHash]) {
            logger.warn(`Attempted to set invalid node ${ nodeHash }`);
            return false;
        }

        logger.info(`Setting node to ${ nodeHash }`);

        this._node = nodeHash;
        this._saveState();

        return true;
    },

    get node() {
        if(!this._nodes[this._node])
            this._node = DEFAULT_NODE;

        return {
            ...this._nodes[this._node],
            nodeHash: this._node
        };
    },

    get nodes() {
        return {
            selectedNode: this._node,
            nodes: this._nodes
        };
    }
};

nodeSelector.init();

export default nodeSelector;