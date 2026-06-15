; SignJoy Inno Setup Configuration Script
; Generates a professional single-file download installer (.exe) for Windows.

[Setup]
AppId={{C39FA4B8-B5CD-4813-A3BE-EA73E67A2634}
AppName=SignJoy
AppVersion=1.0.0
AppPublisher=SignJoy Team
AppSupportURL=https://github.com/teamcore38-droid/Sign-Joy-Unity
AppUpdatesURL=https://github.com/teamcore38-droid/Sign-Joy-Unity
DefaultDirName={localappdata}\SignJoy
DefaultGroupName=SignJoy
DisableProgramGroupPage=yes
OutputBaseFilename=SignJoy_Offline_Setup
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=lowest
OutputDir=dist\setup

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
; Copy all compiled binaries and folders from PyInstaller build output
Source: "..\dist\SignJoy\*"; DestDir: "{app}"; Flags: recursesubdirs createallsubdirs ignoreversion

[Icons]
Name: "{group}\SignJoy"; Filename: "{app}\SignJoy.exe"
Name: "{userdesktop}\SignJoy"; Filename: "{app}\SignJoy.exe"; Tasks: desktopicon

[Run]
Description: "{cm:LaunchProgram,SignJoy}"; Filename: "{app}\SignJoy.exe"; Flags: nowait postinstall skipifsilent
