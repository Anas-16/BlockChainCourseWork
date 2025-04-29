import React from 'react';
import {Dropdown, Stack} from 'react-bootstrap';
import {microAlgosToString, truncateAddress} from '../utils/conversions';
import Identicon from './utils/Identicon'
import PropTypes from "prop-types";

const Wallet = ({address, name, amount, symbol, disconnect}) => {
    if (!address) {
        return null;
    }
    return (
        <>
            <Dropdown>
                <Dropdown.Toggle variant="light" align="end" id="dropdown-basic"
                                 className="d-flex align-items-center border rounded-pill py-1">
                    {amount ? (
                        <>
                            {microAlgosToString(amount)}
                            <span className="ms-1"> {symbol}</span>
                        </>
                    ) : (
                        <span className="ms-1">0 {symbol}</span>
                    )}
                    <span className="ms-2 me-1">
                        <Identicon address={address} size={28} className="d-none d-sm-block"/>
                    </span>
                </Dropdown.Toggle>

                <Dropdown.Menu className="shadow-lg border-0">
                    <Dropdown.Item 
                        href={`https://explorer.bitquery.io/algorand_testnet/address/${address}`}
                        target="_blank">
                        <Stack direction="horizontal" gap={2}>
                            <i className="bi bi-person-circle fs-4"/>
                            <div className="d-flex flex-column">
                                {name && (<span className="font-monospace">{name}</span>)}
                                <span className="font-monospace">{truncateAddress(address)}</span>
                            </div>
                        </Stack>
                    </Dropdown.Item>
                    <Dropdown.Divider/>
                    <Dropdown.Item as="button" className="d-flex align-items-center" onClick={() => {
                        disconnect();
                    }}>
                        <i className="bi bi-box-arrow-right me-2 fs-4"/>
                        Disconnect
                    </Dropdown.Item>
                </Dropdown.Menu>
            </Dropdown>
        </>
    )
};

Wallet.propTypes = {
    address: PropTypes.string,
    name: PropTypes.string,
    amount: PropTypes.number,
    symbol: PropTypes.string,
    disconnect: PropTypes.func
};

export default Wallet;
