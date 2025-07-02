cordova create trackPro-application com.arybit.trackPro Track Pro
cd trackPro-application
keytool -v -genkey -keystore my-release-key.keystore -dname "cn=TrackPro, ou=trackpro, o=Nairobi, c=KE" -alias arybit -keypass Arybit@2021 -keyalg RSA -validity 10000  -storepass Arybit@2021
keytool -list -keystore my-release-key.keystore -storepass Arybit@2021
keytool -export -rfc -keystore my-release-key.keystore -alias arybit  -storepass Arybit@2021 -file upload_certificate.pem

cordova platform add android --save
cordova platform add browser --save
cordova platform add electron --save

cordova plugin add cordova-plugin-device --save
cordova plugin add cordova-plugin-app-version --save
cordova plugin add cordova-plugin-splashscreen --save
cordova plugin add cordova-custom-config --save

cordova plugin add cordova-plugin-android-permissions --save
cordova plugin add cordova-plugin-network-information --save

cordova plugin add cordova-plugin-geolocation --save

cordova plugin add cordova-plugin-camera --save
cordova plugin add cordova-plugin-file --save
cordova plugin add cordova-plugin-file-transfer --save
cordova plugin add cordova-plugin-media --save
cordova plugin add cordova-plugin-media-capture --save

cordova plugin add cordova-plugin-local-notification --save
cordova plugin add cordova-plugin-background-mode --save
cordova plugin add cordova-plugin-vibration --save

cordova plugin add cordova-plugin-firebasex --save
cordova plugin add cordova-plugin-websocket --save

cordova plugin add cordova-clipboard --save
cordova plugin add cordova-plugin-call-number --save
cordova plugin add cordova-plugin-sms --save

cordova run browser
cordova run android --stacktrace --release -- --keystore=my-release-key.keystore --storePassword=Arybit@2021 --alias=arybit --password=Arybit@2021 --packageType=apk
cordova run electron --stacktrace --release -- --keystore=my-release-key.keystore --storePassword=Arybit@2021 --alias=arybit --password=Arybit@2021 --packageType=exe

cordova build android --stacktrace --release -- --keystore=my-release-key.keystore --storePassword=Arybit@2021 --alias=arybit --password=Arybit@2021 --packageType=apk
cordova build electron --stacktrace --release -- --keystore=my-release-key.keystore --storePassword=Arybit@2021 --alias=arybit --password=Arybit@2021 --packageType=exe

