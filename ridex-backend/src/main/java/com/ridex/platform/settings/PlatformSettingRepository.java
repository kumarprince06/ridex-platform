package com.ridex.platform.settings;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface PlatformSettingRepository extends JpaRepository<PlatformSetting, String> {

    List<PlatformSetting> findAllByOrderByKeyAsc();
}
