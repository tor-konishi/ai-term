# Cisco IOS スキル

## 基本操作

### Configモードへの移行
```
enable
configure terminal
```

### Configモードからの抜け方
```
end
exit
```

### 設定の保存
```
write memory
copy running-config startup-config
```

## VLAN設定

### VLAN作成
```
vlan 10
 name SALES
exit
```

### インターフェースへのVLAN割り当て
```
interface GigabitEthernet0/1
 switchport mode access
 switchport access vlan 10
exit
```

### トランクポート設定
```
interface GigabitEthernet0/24
 switchport mode trunk
 switchport trunk allowed vlan 10,20,30
exit
```

## LAG (EtherChannel) 設定

### LACP設定
```
interface range GigabitEthernet0/1-2
 channel-group 1 mode active
 exit
interface Port-channel1
 switchport mode trunk
exit
```

### Static LAG設定
```
interface range GigabitEthernet0/3-4
 channel-group 2 mode on
 exit
interface Port-channel2
 switchport mode access
 switchport access vlan 20
exit
```

## IPアドレス設定

### インターフェースへのIP設定
```
interface Vlan10
 ip address 192.168.10.1 255.255.255.0
 no shutdown
exit
```

### ルーティング設定
```
ip route 0.0.0.0 0.0.0.0 192.168.1.1
```

## セキュリティ設定

### ポートセキュリティ
```
interface GigabitEthernet0/5
 switchport mode access
 switchport port-security
 switchport port-security maximum 2
 switchport port-security violation restrict
exit
```

### SSH設定
```
hostname Switch1
ip domain-name example.com
crypto key generate rsa modulus 2048
line vty 0 4
 transport input ssh
 login local
exit
username admin privilege 15 secret cisco123
```
