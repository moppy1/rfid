/*Copyright (C) Fraunhofer-IDMT. All rights reserved.*/

//##############################################################################
//RFID Reader
//##############################################################################

console.log('#####################')
console.log('#    RFID Reader    #')
console.log('#####################')

// -----------------------------------------------------------------------------
// Dependencies
const usb = require('usb');
const io = require('socket.io');

// -----------------------------------------------------------------------------
// Class definititon
class RfidReader 
{
  constructor() 
  {
    this.initSocket();
    this.initUsbHandler();
  }

  // ---------------------------------------------------------------------------
  // WebSocket
  initSocket()
  {
    const port = 8092;
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
    this.m_socket&&this.m_socket.emit('rfid',data)
  }

  // ---------------------------------------------------------------------------
  // USB Device Connection
  initUsbHandler()
  {
    this.setUsbDeviceSettings();
    this.registerUsbWatcher();
    this.refreshUsbDevices();
  }
  setUsbDeviceSettings()
  {
    // Neuftech USB Reader
    this.m_vendor = "16c0";
    this.m_product = "27db";
  }
  registerUsbWatcher()
  {
    usb.on('attach', (device) => this.connectDevice(device));
    usb.on('detach', (device) => this.disconnectDevice(device));
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
    let ID = '';
    let lastID;
    let counter = 0;
    let lastPoint = undefined;
    let isEnd = false;
    let idMap = [];

    inEndpoint.on("data", (dataBuf) => 
    { 
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
        this.sendSocketMsg(ID)
       
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

  // ---------------------------------------------------------------------------
  // Common helpers
  decimalToHex(decimal)
  {
    if(decimal === undefined) 
      return decimal;
    return decimal.toString(16).padStart(4,'0');
  }
};

new RfidReader();