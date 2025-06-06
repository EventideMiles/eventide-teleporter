@echo off

REM Create releases directory if it doesn't exist
mkdir releases

REM Remove existing zip file if it exists
if exist releases\eventide-teleporter.zip (
    del releases\eventide-teleporter.zip
)

REM Compile files excluding src, node_modules, package.json, and .ignore
REM Assuming compilation involves copying files to a temp directory
set TEMP_DIR=%TEMP%\eventide_teleporter_temp
mkdir "%TEMP_DIR%"

REM Create a new directory for the release
mkdir "%TEMP_DIR%\eventide-teleporter"

REM Copy all files into the new directory
xcopy * "%TEMP_DIR%\eventide-teleporter\" /E /I /EXCLUDE:exclude.txt

REM Minify JavaScript files
node minify.js "%TEMP_DIR%\eventide-teleporter"

REM Remove existing zip file if it exists
if exist releases\eventide-teleporter.zip (
    del releases\eventide-teleporter.zip
)

REM Create the zip file in the releases folder
powershell -command "Compress-Archive -Path '%TEMP_DIR%\eventide-teleporter' -DestinationPath 'releases\eventide-teleporter.zip'"

REM Clean up the temporary directory
rmdir /S /Q "%TEMP_DIR%"
