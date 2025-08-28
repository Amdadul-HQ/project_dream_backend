// import { Injectable, OnModuleInit } from '@nestjs/common';
// import { ConfigService } from '@nestjs/config';
// import { ENVEnum } from 'src/common/enum/env.enum';
// import chalk from 'chalk';
// import * as admin from 'firebase-admin';

// @Injectable()
// export class FirebaseService implements OnModuleInit {
//   constructor(private readonly config: ConfigService) {}

//   onModuleInit() {
//     if (!admin.apps.length) {
//       admin.initializeApp({
//         credential: admin.credential.cert({
//           projectId: this.config.getOrThrow(ENVEnum.FIREBASE_PROJECT_ID),
//           clientEmail: this.config.getOrThrow(ENVEnum.FIREBASE_CLIENT_EMAIL),
//           privateKey: this.config
//             .getOrThrow(ENVEnum.FIREBASE_PRIVATE_KEY)
//             ?.replace(/\\n/g, '\n'),
//         }),
//       });

//       console.info(
//         chalk.bgGreen.white.bold(
//           `🚀 Firebase connected to ${this.config.getOrThrow(
//             ENVEnum.FIREBASE_PROJECT_ID,
//           )} \n`,
//         ),
//       );
//     }
//   }

//   async verifyIdToken(token: string): Promise<admin.auth.DecodedIdToken> {
//     return admin.auth().verifyIdToken(token);
//   }
// }
