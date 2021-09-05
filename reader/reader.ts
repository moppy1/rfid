/*Copyright (C) Fraunhofer-IDMT. All rights reserved.*/

//##############################################################################
//RFID Reader
// 
// * Detection auf USB Device
//##############################################################################

console.log('#####################')
console.log('#    RFID Reader    #')
console.log('#####################')
console.log('')

//#############
//Dependencies
//#############
const fs = require('fs-extra');
const usb = require('usb');
const argparse = require('argparse').ArgumentParser;
const log = require('single-line-log').stdout;
const io = require('socket.io');

class RfidReader 
{
  m_vendor: string = "16c0";
  m_product: string = "27db";
  m_socket: any;
  
  constructor() 
  {
    //this.initSocket();
    this.initUsbWatcher();
  }
  initSocket()
  {
    const port:number = 8092;
    this.m_socket = io().listen(port);
    this.m_socket.on('connection', (socket) =>
    {
      console.log('[Socket] Connected to app');
      socket.on('disconnect', () => 
      {
        console.log('[Socket] Disconnected from app');
      });
      socket.on('message', (data) =>
      {
        console.log(data)
      });
    });
  }
  sendSocketMsg(data)
  {
    this.m_socket&&this.m_socket.emit(data)
  }

  connectDevice(device)
  {
    if(!this.getDevice(device)) return;
    console.log('USB Device connected');
    let canBeOpened = true;
    try
    {
      device.open()
    }
    catch(err)
    {
      console.log('Can not access device', err)
      canBeOpened = false;
    }

    if(!canBeOpened) return;

    console.log('DEVICE OPEN')

    var iface = device.interfaces[0];
    const desc = device.deviceDescriptor;
    
    iface.claim();
    const inEndpoint = iface.endpoints[0];

    let dataBuffer = [];
    let ID:string = '';
    let lastID:string = '';
    let counter:number = 0;
    let lastPoint:any = undefined;
    let isEnd:boolean = false;
    let idMap = [];

    inEndpoint.on("data", (dataBuf) => 
    { 
      console.log(dataBuf)
      const dataArr = Array.prototype.slice.call(new Uint8Array(dataBuf, 0, 8)); // convert buffer to array
      if(lastPoint == 40 && dataArr[2] == 0)
        isEnd = true;      
      lastPoint = dataArr[2];
      dataBuffer.push(dataArr[2]);
      counter++;
      if(isEnd)
      {
        ID = dataBuffer.join('');
        var mapIndex = idMap.indexOf(ID);
        if(mapIndex == -1)
        {
          console.log('NEW ID', ID);
          idMap.push(ID)
        }
        else
        {
          console.log('KNOWN ID', ID, 'MAP INDEX', mapIndex);
        }
       
        lastID = ID;
        counter = 0;
        dataBuffer = [];
        isEnd = false;
      }

    })
  
    inEndpoint.on("error", function(dataBuf) { console.log(dataBuf); });
    inEndpoint.startPoll(1,desc.wMaxPacketSize0);

  }
  disconnectDevice(device)
  {
    console.log('USB Device disconnected');
    if(!this.getDevice(device)) return;
    device.close();
  }
  refreshUsbDevices()
  {
    let list = usb.getDeviceList();
    for (let device of list)
    {
      this.connectDevice(device);
    } 
  }  
  getDevice(device)
  {
    const desc = device.deviceDescriptor;
    if(this.decimalToHex(desc.idProduct) == this.m_product && this.decimalToHex(desc.idVendor) == this.m_vendor)
      return true;
  }
  initUsbWatcher()
  {
    usb.on('attach', (device) => this.connectDevice(device));
    usb.on('detach', (device) => this.disconnectDevice(device));
    this.refreshUsbDevices();
  }
  decimalToHex(decimal)
  {
    if(decimal === undefined) 
      return decimal;
    return decimal.toString(16).padStart(4,'0');
  }
}

new RfidReader();