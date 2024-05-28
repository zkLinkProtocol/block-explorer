import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule, JwtService } from "@nestjs/jwt";
import { AuthGuard } from "./authGuard";

@Module({
  imports: [
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return {
          secret: configService.getOrThrow("JWT_SECRET"),
          signOptions: { expiresIn: "3h" },
        };
      },
    }),
  ],
  providers: [ConfigService, AuthGuard],
  exports: [AuthGuard],
  controllers: [],
})
export class AuthModule {}
