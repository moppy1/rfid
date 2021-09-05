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

var UsbTool = function()
{
  this.Config();
  this.DefaultDevices();
  this.UsbWatcher();
  this.refreshUsbDevices();
}

//#############
//Helpers
//#############
var decimalToHex = function(decimal)
{
  if(decimal === undefined) 
    return decimal;
  return decimal.toString(16).padStart(4,'0');
}

//#############
//Config
//#############
UsbTool.prototype.Config = function()
{  
  console.log('Init Config');

  const cfgFile = 'config.json';
  const cfgFilePath = './'+cfgFile;
  this.m_cfgData = '';

  var defaultCfg = 
  {
    hid: []
  };
  //..............................................................................
  let initConfig = () =>
  {
    let cb = () => console.log('Set config successfully');
    
    if (!_fileExists(cfgFilePath))
    {
      console.log('Unable to find config file (' + cfgFilePath +')');
    }
    else
      loadConfigFromFile(cb);    
  }
  //..............................................................................
  let loadConfigFromFile = (cb) =>
  {
    try 
    {
      this.m_cfgData = fs.readFileSync(cfgFilePath, 'utf-8');
      console.log('Load config from file ('+cfgFilePath+')');
      if(this.m_cfgData)
        this.m_cfgData = JSON.parse(this.m_cfgData);
      if(cb) cb();
    } 
    catch(e) 
    {
      console.error('IDMT010195: Error reading config file: ' + cfgFilePath);
      return false;
    }
  }
  //..............................................................................
  let _fileExists = (filename) =>
  {
    try {
      fs.accessSync(filename);
      return true;
    } catch(e) {
      return false;
    }
  }
  initConfig();
}

//##################
//USB
//##################
UsbTool.prototype.UsbWatcher = function()
{
  console.log('Init USB Watcher')

  this.registerDevice = device =>
  {
    let desc = device.deviceDescriptor; ;    
    desc.idProductHex = decimalToHex(desc.idProduct);
    desc.idVendorHex = decimalToHex(desc.idVendor);
    
    let dev = this.getDevice({product: desc.idProductHex, vendor: desc.idVendorHex});
    if(!dev)
    {
      console.log('[USB Manager] Unknown Device Recognized', '(VendorID: '+desc.idVendorHex +', ProductID: '+desc.idProductHex+')')
      return
    }
    else
    {
      desc.alias = dev.alias;
      console.log('[USB Manager] Added Device "'+dev.alias+'"', '(VendorID: '+desc.idVendorHex+', ProductID: '+desc.idProductHex+')', '| readable: '+dev.readable, '| API: '+dev.api);
      console.log(desc);
    }  
    
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

    var iface = device.interfaces[0];
    
    iface.claim();
    var inEndpoint = iface.endpoints[0];

    var length = 13;
    var dataBuffer = [];
    var ID = '';
    var lastID = '';
    var counter = 0;
    var lastPoint = undefined;
    var isEnd = false;

    var idMap = [];

    inEndpoint.on("data", (dataBuf) => 
    { 
      let dataArr = Array.prototype.slice.call(new Uint8Array(dataBuf, 0, 8)); // convert buffer to array
      let logStr = ['(VendorID: '+desc.idVendorHex+', ProductID: '+desc.idProductHex+') '];
      dataArr.forEach((d,i) => logStr += '['+i+'] ' + d + ' ');
      //console.log(logStr)
      // console.log(dataArr[2])
      if(lastPoint == 40 && dataArr[2] == 0)
        isEnd = true;
      
      lastPoint = dataArr[2];
      //log(logStr);
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
  this.unregisterDevice = device =>
  {
    let desc = device.deviceDescriptor; 
    let dev = this.getDevice({product: desc.idProductHex, vendor: desc.idVendorHex});
    if(!dev)
      return;
    desc.alias = dev.alias;
    console.log('[USB Manager] Removed Device', '"'+dev.alias+'"','(VendorID: '+desc.idVendorHex+', ProductID: '+desc.idProductHex+')')
    device.close();
  }
  usb.on('attach', (device) => this.registerDevice(device));
  usb.on('detach', (device) => this.unregisterDevice(device));

  this.refreshUsbDevices = () =>
  {
    let list = usb.getDeviceList();
    for (device of list)
    {
      let desc = device.deviceDescriptor;
      this.registerDevice(device);
    } 
  }  
}

//##################
//Devices
//##################
UsbTool.prototype.DefaultDevices = function()
{
  console.log('Init HID Devices')
  let defaultDevices = this.m_cfgData.hid;
  
  let isContaining = function(attr, object)
  {
    let contains = true;
    for (var key in attr)
    {
      if (attr[key] != object[key])
      {
        contains = false;
        break;
      }
    }
    return contains;
  }
  
  this.getDevice = function(attr)
  {
    let device = false;
    for(dev of defaultDevices)
    {
      let isEqual = isContaining(attr,dev);
      if(isEqual)
      {
        device = dev;
        break;
      }
    }
    return device;
  }
  
  //..............................................................................
  this.getAlias = function(attr)
  {
    let alias = false;
    for(name in defaultDevices)
    {
      let isEqual = isContaining(attr,defaultDevices[name]);
      if(isEqual)
      {
        alias = name;
        break;
      }
    }
    return alias;
  }
}

new UsbTool();
