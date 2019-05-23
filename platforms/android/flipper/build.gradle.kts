import com.android.build.gradle.TestedExtension

plugins {
  id("com.android.library")
  id("signing")
  id("com.jfrog.bintray")
  id("maven-publish")
}

setupAndroidProject(project)

android {

  defaultConfig {
    buildConfigField("boolean", "IS_INTERNAL_BUILD", "true")

    externalNativeBuild {
      cmake {
        arguments.addAll(listOf("-DANDROID_TOOLCHAIN=clang", "-DANDROID_STL=c++_static"))
        targets.clear()
        targets.add("flipper")
      }
    }
  }

    lintOptions {
        isAbortOnError = false
    }


  sourceSets["test"].apply {
    java.exclude("com/facebook/flipper/plugins/facebook/**")
  }


  externalNativeBuild {
    cmake {
      path = file("CMakeLists.txt")
    }
  }

}

dependencies {
  compileOnly(deps.lithoAnnotations)

  compileOnly(project(":common:xplat"))
  implementation(project(":platforms:android:fbjni"))

  implementation(deps.soloader)
  implementation(deps.jsr305)
  implementation(deps.mdns)
  implementation(deps.supportAppCompat)
  implementation(deps.stetho)
  implementation(deps.okhttp3)
  implementation(deps.lithoCore)
  implementation(deps.lithoSectionsDebug)
  implementation(deps.lithoSectionsCore)
  implementation(deps.lithoWidget)
  implementation(deps.rhino)
  implementation(deps.fresco)
  implementation(deps.frescoFlipper)
  implementation(deps.frescoStetho)
  listOf(
    "io.reactivex.rxjava2:rxandroid:2.1.1",
    "io.reactivex.rxjava2:rxjava:2.2.8",
    "org.reactivestreams:reactive-streams:1.0.2"
  ).forEach { implementation(it) }


  compileOnly(deps.leakcanary)

  testImplementation(deps.mockito)
  testImplementation(deps.robolectric)
  testImplementation(deps.hamcrest)
  testImplementation(deps.junit)
  testImplementation(deps.junit)
}

setupAndroidPublishProject(project, true)

setupAndroidThirdPartyProject(project)

// apply from: rootProject.file("gradle/release.gradle")

// tasks.create("sourcesJar", Jar) {
//     from android.sourceSets.main.java.srcDirs
//     classifier = "sources"
// }

// artifacts.add("archives", sourcesJar)
