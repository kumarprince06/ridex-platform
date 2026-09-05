package com.ridex.notification.push;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface DeviceTokenRepository extends JpaRepository<DeviceToken, String> {

    Optional<DeviceToken> findByToken(String token);

    List<DeviceToken> findByUserId(String userId);

    List<DeviceToken> findByUserIdAndAppContext(String userId, String appContext);
}
