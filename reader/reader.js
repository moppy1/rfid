/*Copyright (C) Fraunhofer-IDMT. All rights reserved.*/
//##############################################################################
//RFID Reader
// 
// * Detection auf USB Device
//##############################################################################
console.log('#####################');
console.log('#    RFID Reader    #');
console.log('#####################');
console.log('');
//#############
//Dependencies
//#############
var fs = require('fs-extra');
var usb = require('usb');
var argparse = require('argparse').ArgumentParser;
var log = require('single-line-log').stdout;
var io = require('socket.io');
var RfidReader = /** @class */ (function () {
    function RfidReader() {
        this.m_vendor = "16c0";
        this.m_product = "27db";
        //this.initSocket();
        this.initUsbWatcher();
    }
    RfidReader.prototype.initSocket = function () {
        var port = 8092;
        this.m_socket = io().listen(port);
        this.m_socket.on('connection', function (socket) {
            console.log('[Socket] Connected to app');
            socket.on('disconnect', function () {
                console.log('[Socket] Disconnected from app');
            });
            socket.on('message', function (data) {
                console.log(data);
            });
        });
    };
    RfidReader.prototype.sendSocketMsg = function (data) {
        this.m_socket && this.m_socket.emit(data);
    };
    RfidReader.prototype.connectDevice = function (device) {
        if (!this.getDevice(device))
            return;
        console.log('USB Device connected');
        var canBeOpened = true;
        try {
            device.open();
        }
        catch (err) {
            console.log('Can not access device', err);
            canBeOpened = false;
        }
        if (!canBeOpened)
            return;
        console.log('DEVICE OPEN');
        var iface = device.interfaces[0];
        var desc = device.deviceDescriptor;
        iface.claim();
        var inEndpoint = iface.endpoints[0];
        var dataBuffer = [];
        var ID = '';
        var lastID = '';
        var counter = 0;
        var lastPoint = undefined;
        var isEnd = false;
        var idMap = [];
        inEndpoint.on("data", function (dataBuf) {
            console.log(dataBuf);
            var dataArr = Array.prototype.slice.call(new Uint8Array(dataBuf, 0, 8)); // convert buffer to array
            if (lastPoint == 40 && dataArr[2] == 0)
                isEnd = true;
            lastPoint = dataArr[2];
            dataBuffer.push(dataArr[2]);
            counter++;
            if (isEnd) {
                ID = dataBuffer.join('');
                var mapIndex = idMap.indexOf(ID);
                if (mapIndex == -1) {
                    console.log('NEW ID', ID);
                    idMap.push(ID);
                }
                else {
                    console.log('KNOWN ID', ID, 'MAP INDEX', mapIndex);
                }
                lastID = ID;
                counter = 0;
                dataBuffer = [];
                isEnd = false;
            }
        });
        inEndpoint.on("error", function (dataBuf) { console.log(dataBuf); });
        inEndpoint.startPoll(1, desc.wMaxPacketSize0);
    };
    RfidReader.prototype.disconnectDevice = function (device) {
        console.log('USB Device disconnected');
        if (!this.getDevice(device))
            return;
        device.close();
    };
    RfidReader.prototype.refreshUsbDevices = function () {
        var list = usb.getDeviceList();
        for (var _i = 0, list_1 = list; _i < list_1.length; _i++) {
            var device = list_1[_i];
            this.connectDevice(device);
        }
    };
    RfidReader.prototype.getDevice = function (device) {
        var desc = device.deviceDescriptor;
        if (this.decimalToHex(desc.idProduct) == this.m_product && this.decimalToHex(desc.idVendor) == this.m_vendor)
            return true;
    };
    RfidReader.prototype.initUsbWatcher = function () {
        var _this = this;
        usb.on('attach', function (device) { return _this.connectDevice(device); });
        usb.on('detach', function (device) { return _this.disconnectDevice(device); });
        this.refreshUsbDevices();
    };
    RfidReader.prototype.decimalToHex = function (decimal) {
        if (decimal === undefined)
            return decimal;
        return decimal.toString(16).padStart(4, '0');
    };
    return RfidReader;
}());
new RfidReader();
