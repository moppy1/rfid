const serverUrl = 'http://127.0.0.1:8092';
const socket = io.connect(serverUrl,
{
  //Configure the socket
  'transports': ['websocket', 'polling'],
  'connect timeout': 500,
  'max reconnection attempts': 100000000,
  'reconnect': true
});
socket.on('connecting', () => 
{
  console.log('Try to connect to server ' + serverUrl);
});
socket.on('connect', () => 
{      
  console.log('Connected to Service');
});
socket.on('disconnect', () => 
{
  console.log('Disconnected from Service!');
});
socket.on('rfid', (data) => 
{
  vUsers.toggleLogin(data);
})